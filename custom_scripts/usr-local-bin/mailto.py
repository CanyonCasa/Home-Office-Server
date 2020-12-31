#!/usr/bin/python

import sys
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import json
from pprint import pprint

# read default data: JSON object with fields for...
  # subject: message subject line
  # message: default message
  # you: (default) TO address
  # me: FROM address
  # server: SMTP server host
  # port: SMTP server port
  # username: SMTP username
  # pw: SMTP login password
data = json.load(open('/usr/local/etc/mailto.json'))
#pprint(data)

# compose fields...
if len(sys.argv)>1:
  data["subject"] = sys.argv[1]
if len(sys.argv)>2:
  data["you"] = ','.join(sys.argv[2:])

# get message from input stream...
for line in sys.stdin:
  try:
    data["message"] += line
  except:
    data["message"] += "************* SKIPPED UNICODE ERROR *************\n"

# Create message container - the correct MIME type is multipart/alternative.
msg = MIMEMultipart('alternative')
msg['Subject'] = data["subject"]
msg['From'] = data["me"]
msg['To'] = data["you"]

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
""" % (data["subject"],data["message"])

# Record the MIME types of both parts - text/plain and text/html.
part1 = MIMEText(text, 'plain')
part2 = MIMEText(html, 'html')

# Attach parts into message container.
# According to RFC 2046, the last part of a multipart message, in this case
# the HTML message, is best and preferred.
msg.attach(part1)
msg.attach(part2)

#pprint("")
#pprint(msg)
#pprint("")
#pprint(data)
#pprint(msg.as_string())

# Send the message via local SMTP server.
s = smtplib.SMTP_SSL(data["server"],int(data["port"]))
s.login(data["username"],data["pw"])
# sendmail function takes 3 arguments: sender's address, recipient's address
# and message to send - here it is sent as one string.
s.sendmail(data["me"], data["you"], msg.as_string())
s.quit()
