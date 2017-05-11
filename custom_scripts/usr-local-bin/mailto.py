#!/usr/bin/python

import sys
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

# compose fields...
subject = "SERVER SCRIPT: " + sys.argv[1]
if len(sys.argv)>2:
  you = ','.join(sys.argv[2:])
else:
  you = "********"
me = "********"
server = "mail.noip.com"
port = "465"
username = "********"
pw = "********"
message = ''
for line in sys.stdin:
  message += line

# Create message container - the correct MIME type is multipart/alternative.
msg = MIMEMultipart('alternative')
msg['Subject'] = subject
msg['From'] = me
msg['To'] = you

# Create the body of the message (a plain-text and an HTML version).
text = "Automatic script ..."
html = """\
<html>
  <head></head>
  <body>
    <p>%s</p>
    <pre>%s</pre>
  </body>
</html>
""" % (subject,message)

# Record the MIME types of both parts - text/plain and text/html.
part1 = MIMEText(text, 'plain')
part2 = MIMEText(html, 'html')

# Attach parts into message container.
# According to RFC 2046, the last part of a multipart message, in this case
# the HTML message, is best and preferred.
msg.attach(part1)
msg.attach(part2)

# Send the message via local SMTP server.
s = smtplib.SMTP_SSL(server,port)
s.login(username,pw)
# sendmail function takes 3 arguments: sender's address, recipient's address
# and message to send - here it is sent as one string.
s.sendmail(me, you, msg.as_string())
s.quit()
