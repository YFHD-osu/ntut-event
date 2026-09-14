# 直屬活動分配查詢系統
This is a project specifically made for **NTUT CSIE Meet Your Buddy** event.  <br>
Users can recieve the contace information for thier buddy by log-into school's Google account. 

## Technical Architecture
### Frontend
A static web page host by Github which provide a portal to enter Oauth screen and display result. <br>
By passing the Oauth screen, javascript will send the jwt token to the Google App Script endpoint to recieve the data.

### Backend
A Google Script App direct link to google sheet system, which can validate the JWT token and grab the group information from the sheet dynamically, then return it in json format.
