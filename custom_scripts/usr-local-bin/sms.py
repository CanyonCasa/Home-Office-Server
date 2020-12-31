#!/usr/bin/python3
import sys
import json
import requests
from twilio.rest import Client

# test flag
feedback = True

# get twilio account credentials and properties...
with open('/usr/local/etc/twilio.json') as json_file:  
  twilio = json.load(json_file)
#print(twilio)

# parse commandline
#print(sys.argv,len(sys.argv),str(sys.argv))
if len(sys.argv)<2:
  print('SYNTAX: python '+sys.argv[0]+' [comma delimitted "to-numbers" list] ["message"]')
  exit()
who = sys.argv[1] if len(sys.argv)==3 else twilio['to']
toWhom = []
for w in who.split(','):
  toWhom.append(w if w.startswith('+1') else '+1'+w)
msg = sys.argv[2] if len(sys.argv)==3 else sys.argv[1] if len(sys.argv)==2 else 'Default SMS from '+twilio['name']

# create a client instance
client = Client(twilio['account_sid'], twilio['auth_token'])

# send message to all recipients...
for who in toWhom:
  message = client.messages.create(
      to = who, 
      from_ = twilio['number'],
      provide_feedback = feedback,
      body = msg
      )
  # equivalent --> curl https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages/{message_sid}.json -u {account_sid}:{auth_token}
  if feedback:
    uri = 'https://api.twilio.com/2010-04-01/Accounts/'+twilio['account_sid']+'/Messages/'+message.sid+'.json'
    #print(message.sid,uri)
    rqst = requests.get(uri,auth=(twilio['account_sid'],twilio['auth_token']))
    if rqst.status_code==200: 
      print(json.dumps(rqst.json(),indent=2))

