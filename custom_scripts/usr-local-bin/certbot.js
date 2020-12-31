#!/usr/bin/env node

// runs as JavaScript based on Shebang!
// wrapper for /usr/bin/certbot ...

// external references...
module.paths.push('/usr/lib/node_modules');
const p = require('process');
const fs = require('fs');
const axios = require('axios');
const exec = require('child_process').execSync;
const forge = require('node-forge');

// site specific data...
const site = require('/usr/local/etc/certbot');
const twilio = require('twilio');
const cfg = {$twilio: require('/usr/local/etc/twilio')};

// data and variables...
const node = p.argv[0];
const path = p.argv[1].split('/').slice(0,-1).join('/');
const script = p.argv[1].split('/').slice(-1)[0].concat('.js').split('.',2).join('.');
const cmdLine = p.argv.join(' ');
const flags = [];
const args = p.argv.slice(2).filter(a=>a.startsWith('-') ? !flags.push(a[1]) : true); // parse flags from arguments
var action = args[0];
if (action=='test') flags.push('i');

let cmd; let option = site.certbot.option || ''; let verbose = false;
let dtd = (new Date()).toISOString().replace(/:/g,'-');
let log = args[1] || site.certbot.log + '--' + dtd;

function logged(prompt) {
  let output = `${new Date().toISOString()}  ${typeof prompt=='object' ? JSON.stringify(prompt) : prompt}`;
  if (flags.includes('i')) console.log(output);
  fs.writeFileSync(log,output+'\n',{flag:'a'});
};

// syntax message...
function syntax() { 
  console.log(`SYNTAX: [${path}/] ${script} -i[nteractive] -q[uiet] get|update|renew|check|copy|notify|view|verbose|test|help`);
  console.log('  where ...');
  console.log('    get:     Gets/creates a new certificate. (Use only one time.)');
  console.log('    update:  Updates an existing certificate with domain changes (made to the configuration).');
  console.log('    renew:   Renews a certiciate, if it is due, sends text message; Calls check');
  console.log('    check:   Checks if a certiciate renewal updated certificate files; Calls copy, if change detected');
  console.log('    copy:    Copies certiciate files to server; Calls notify.');
  console.log('    notify:  Notifies server of certificate renewal and sends text message.');
  console.log('    view:    View certificate expiration.');
  console.log('    verbose: View certificate/key details.');
  console.log('    test:    Just executes the script to test install.');
  console.log('    help:    This help.');
};
if (args.length==0 || flags.includes('-h')) {
  syntax();
  p.exit(1);
};

// sms twilio wrapper assumes msg provides valid 'numbers' list (or use defaults) and a 'body/text' 
async function sms(msg={}) {
  if (flags.includes('q')) return { rpt: 'Text messaging turned off', queue:[] };
  if (!cfg.$twilio) throw 501;
  let { admin, accountSID, authToken, number, statusCallback } = cfg.$twilio;
  try {
    let numbers = msg.numbers || admin;
    if (typeof numbers=='string') numbers = numbers.split(',');
    const client = twilio(accountSID,authToken);
    let queue = [];
    await Promise.all(numbers.map(n=>
      client.messages.create({to: n, from: number, body: msg.body||msg.text, statusCallback: statusCallback})
        .then(m =>{ queue.push(m); logged(`Text message queued to: ${n}`); return m; })
        .catch(e=>{ logged("e:",e); throw e }) ));
    logged(JSON.stringify(queue,null,2));
    return {rpt: `Text message queued for ${numbers.length} ${numbers.length==1?'number':'numbers'}`, queue: queue};
  } catch (ee) { logged("ee:",ee); throw ee };
};


// script actions...
async function certbotDo(action) {
  switch (action) {
    case 'update':
      option = option + ' --expand';
    case 'get':
      let x = option.includes('--expand');
      let domains = site.certbot.domains instanceof Array ? site.certbot.domains.join(',') : site.certbot.domains;
      let domain = domains.split(',')[0];
      if (fs.existsSync(site.letsencrypt.path) && !x) {
        logged(`ERROR: Certificate already exists for domain ${domain} at ${site.letsencrypt.path}`);
        logged(`  Use update command instead.`);
      } else
        logged(`${x?'Updating':'Creating'} certificate for webroot ${site.certbot.webroot}`);
        cmd = `certbot certonly ${option} --force-interactive --webroot -w ${site.certbot.webroot} -d ${domains}`;
        logged(`Executing command: ${cmd}`);
        logged(`cmd: ${cmd}`);
        try {
          logged(exec(cmd));
        } catch (e) { logged(e.message||e.toString()); };
        logged(`${x?'Updated':'Created'} certificate for webroot ${site.certbot.webroot} domain ${domain}`);
      return;
    case 'renew':
      msg = `${site.server.hostname.toUpperCase()} certificate renewal check!`;
      logged(msg);
      cmd = `certbot renew ${option}`;
      logged(`cmd: ${cmd}`);
      try {
        logged(exec(cmd));
      } catch (e) { logged(e.message||e.toString()); };
      logged(`Messaging admin of certificate renew check ...`);
      sms({text: msg}).then(r=>logged(r.rpt)).catch(e=>logged(e));
    case 'check':
      let chgd = false; 
      logged(`Checking certificate changes for ${site.letsencrypt.path} against ${site.server.path}...`);
      let chks = fs.readdirSync(site.letsencrypt.path).filter(f=>f.endsWith('.pem'))
        .map(cf=>({src: site.letsencrypt.path+'/'+cf, dest: site.server.path+'/'+cf}));
      chks.forEach((c,i)=>{
        let st = fs.statSync(c.src).mtime;
        let dt = fs.existsSync(c.dest) ? fs.statSync(c.dest).mtime : '';
        chgd = chgd || st.toString()!=dt.toString();
      });
      if (!chgd) return;
    case 'copy':
      const { uid, gid } = fs.statSync(site.server.path);
      logged(`Copying certificate changes from ${site.letsencrypt.path} to ${site.server.path}...`);
      let files = fs.readdirSync(site.letsencrypt.path).filter(f=>f.endsWith('.pem'))
        .map(cf=>({src: site.letsencrypt.path+'/'+cf, dest: site.server.path+'/'+cf}));
      files.forEach((c,i)=>{
        try {
          files[i].sStats = fs.statSync(c.src);
          files[i].dStats = fs.existsSync(c.dest) ? fs.statSync(c.dest) : {mode: 0o660, mtime:''};
          fs.copyFileSync(c.src,c.dest);
          fs.chmodSync(c.dest,c.dStats.mode&0x1FF);
          fs.chownSync(c.dest,uid,gid);
          fs.utimesSync(c.dest,c.sStats.atime,c.sStats.mtime);
        } catch (e) { logged(`ERROR: ${e} `); };
      });
    case 'notify':
      logged(`Notifying server of certificate changes ...`);
      msg = `${site.server.hostname.toUpperCase()} certificate renewal successful!\n${log}`;
      try {
        logged((await axios(site.server.notification)).data);
      } catch(e) { msg = `${site.server.hostname.toUpperCase()} certificate renewal failed!\n${log}`; };
      logged(`Messaging admin of certificate changes ...`);
      logged(msg);
      sms({text: msg}).then(r=>logged(r.rpt)).catch(e=>logged(e));
      return;
    case 'verbose':
      verbose = true;
    case 'view':
      logged(`Server certificates[${site.server.path}]... `);
      let certs = fs.readdirSync(site.server.path).filter(f=>f.endsWith('.pem'));
      certs.forEach(c=>{
        let spec = site.server.path + '/' + c;
        try {
          let certificate = fs.readFileSync(spec,'utf8');
          if (certificate.startsWith('-----BEGIN CERTIFICATE-----')) {
            if (verbose) logged(`\n\nX509 certificate: ${spec} ...\n`, 
              exec(`openssl x509 -in ${spec} -text`).toString());
            let expBefore = forge.pki.certificateFromPem(certificate).validity.notBefore;
            let expAfter = forge.pki.certificateFromPem(certificate).validity.notAfter;
            logged(`  Certificate: ${spec} valid: ${expBefore} to ${expAfter}`);
          };
          if (verbose && certificate.startsWith('-----BEGIN PRIVATE KEY-----')) 
            logged(`\n\nPrivate Key: ${spec} ...\n`, exec(`openssl pkey -in ${spec} -text`).toString());
        } catch (e) { logged(`  ERROR reading certificate: ${c} => ${e}`); }
      });
      return;
    case 'help':
      syntax();
      p.exit(1);
    case 'test':
      logged(`This is a test ...`);
      break;
    case 'cleanup':
      logged(`Performing cleanup work ...`);
      fs.copyFileSync(log,site.certbot.log);
      break;
    default:
      logged(`UNKNOWN action ${action}`);
      syntax();
      p.exit(2);
  };
};

logged(`Certbot wrapper script: ${cmdLine}`);
logged(`Logfile: ${log}`);

(async ()=>{
  while (action) {
    action = await certbotDo(action);
  };
})().then(x=>certbotDo('cleanup')).catch(e=>{console.log(e)})
