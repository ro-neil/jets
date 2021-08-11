"""
Flask Documentation:     http://flask.pocoo.org/docs/
Jinja2 Documentation:    http://jinja.pocoo.org/2/documentation/
Werkzeug Documentation:  http://werkzeug.pocoo.org/documentation/
This file creates your application.
"""

from app import app, db, login_manager
from flask import render_template, request, redirect, url_for, flash, g, _request_ctx_stack
from flask_login import login_user, logout_user, current_user, login_required
from app.forms import *
from app.models import *
from werkzeug.security import check_password_hash, generate_password_hash
from flask.json import jsonify
from datetime import datetime, timedelta
from werkzeug.utils import secure_filename
import os
import jwt
import random
from sqlalchemy import and_
from functools import wraps
from flask.helpers import send_from_directory


USR_DATE_FORMAT = "%b %d, %Y"
SYS_DATE_FORMAT = "%Y-%m-%d"
USR_TIME_FORMAT = "%I:%M %p"
SYS_TIME_FORMAT = "%H:%M:%S"
USR_DATETIME_FORMAT = f"{USR_DATE_FORMAT} {USR_TIME_FORMAT}"
SYS_DATETIME_FORMAT = f"{SYS_DATE_FORMAT} {SYS_TIME_FORMAT}"


# Create a JWT @requires_auth decorator
# This decorator can be used to denote that a specific route should check
# for a valid JWT token before displaying the contents of that route.
def requires_auth(f):
  @wraps(f)
  def decorated(*args, **kwargs):
    auth = request.headers.get('Authorization', None) # or request.cookies.get('token', None)

    if not auth:
      return jsonify({'code': 'authorization_header_missing', 'description': 'Authorization header is expected'}), 401

    parts = auth.split()

    if parts[0].lower() != 'bearer':
      return jsonify({'code': 'invalid_header', 'description': 'Authorization header must start with Bearer'}), 401
    elif len(parts) == 1:
      return jsonify({'code': 'invalid_header', 'description': 'Token not found'}), 401
    elif len(parts) > 2:
      return jsonify({'code': 'invalid_header', 'description': 'Authorization header must be Bearer + \s + token'}), 401

    token = parts[1]
    try:
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])

    except jwt.ExpiredSignatureError:
        return jsonify({'code': 'token_expired', 'description': 'token is expired'}), 401
    except jwt.DecodeError:
        return jsonify({'code': 'token_invalid_signature', 'description': 'Token signature is invalid'}), 401

    g.current_user = user = payload
    return f(*args, **kwargs)

  return decorated

###
# Routing for the application.
###

@app.route("/api/register", methods=["POST"])
# @login_required
# @requires_auth
def register():
    """ Register a user """

    form = RegistrationForm()

    if form.validate_on_submit():
        # include security checks #

        username = request.form['username']
        if User.query.filter_by(username=username).first(): # if username already exist
            response = jsonify({'error':'Try a different username or contact the administrator.'})
            return response

        password = request.form['password']

        user = User(username, password, 'False')

        db.session.add(user)
        db.session.commit()

        login_user(user)
        payload = {
            "sub": "352741018090",
            "name": username,
            "issue": current_datetime(SYS_DATETIME_FORMAT)
        }
        encoded_jwt = jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')
        response = jsonify({"message": "Login Successful", 'token':encoded_jwt, 'user':{'id':user.id, 'name':user.username, 'isAdmin':user.isAdmin}}) # Hash user_id before sending
        return response

        # # convert sqlalchemy user object to dictionary object for JSON parsing
        # data = obj_to_dict(user)
        # data.pop('password')
        # data.pop('salt')
        # response = jsonify(data)
        # return response
    else:
        response = jsonify(form.errors)
        return response
 

@app.route("/api/deregister", methods=["GET"])
@login_required
@requires_auth
def deregister():
    print(request.args.get('q'))
    if current_user.is_admin():
    
        username = request.args.get('q')
        user = User.query.filter_by(username=username).first()

        if user:
            print('\nDeleting user')
            db.session.delete(user)
            print('\nSaving changes')
            db.session.commit()
            #Logout if deleting own account
            if current_user.get_id() == user.get_id():
                logout()

            response = jsonify({'message':f'{username} was deregistered'})
            return response
        response = jsonify({'message':f"{username} doesn't exist"})
        return response
    else:
        response = jsonify(message='You are unauthorized')
        return response

@app.route("/api/auth/login", methods=["POST"])
def login():
    """ Login a user """
    form = LoginForm()
    if form.validate_on_submit():
        # include security checks #
        username = request.form['username']
        password = request.form['password']

        # db access
        user = User.query.filter_by(username=username).first()
        # validate the password and ensure that a user was found
        if user is not None and check_password_hash(user.password, password + user.salt):
            login_user(user)
            payload = {
                "sub": "352741018090",
                "name": username,
                "issue": current_datetime(SYS_DATETIME_FORMAT)
            }
            encoded_jwt = jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')
            response = jsonify({"message": "Login Successful", 'token':encoded_jwt, 'user':{'id':user.id, 'name':user.username, 'isAdmin':user.isAdmin}}) # Hash user_id before sending
            return response
        else:
            response = jsonify({'error':'Username or Password is incorrect.'})
            return response
    else:
        response = jsonify(form.errors)
        return response


@app.route("/api/auth/logout", methods=["GET"])
@login_required
@requires_auth
def logout():
    """Logs out the user and ends the session"""

    try:
        logout_user()
    except Exception:
        return 'Access token is missing or invalid, 401'

    response = jsonify({"message": "Log out successful"})
    return response


@app.route("/api/snapshot", methods=["GET"])
@login_required
@requires_auth
def getOffenderSnapshot():
    
    try:
        image = get_random_file(app.config['UPLOADS_FOLDER'])
        response = {'image': os.path.join(app.config['UPLOADS_FOLDER'], image)}
    except Exception:
        response = {'id':'#'}
        
    return jsonify(response) 


@app.route("/api/simulate", methods=["GET"])
@login_required
@requires_auth
def simulateOffense():  # pass image name after viewing on front end
    """ Simulate an Offense """

    print(f'\nGetting random traffic cam data')
    # SELECT A RANDOM TRAFFIC CAMERA AND IMAGE. QUERY OFFENCE TABLE FOR THE SELECTED VALID CAM OFFENCE
    trafficCam = get_random_record(TrafficCam)
    offenceCode = random.choice(trafficCam.validOffences.split())    # Extract the list of valid offences for the selected camera and select a random choice
    offence = Offence.query.get(offenceCode)
    location = Location.query.get(trafficCam.locationID)
    image = request.args.get('q').split('/')[-1]    #get image name only #get_random_file(app.config['UPLOADS_FOLDER'])   # Return a random file from the uploads folder

    # IF THERE ARE NO MORE IMAGES IN THE ./uploads FOLDER
    # RETURN None

    if image == None:
        print('\nNO MORE IMAGES TO SERVE\n')
        return generate_empty_ticket()
    
    # IF THERE ARE NO Locations IN THE DB
    # RETURN BLANK None
    if location == None:
        print('\nNo locations found\n')
        return generate_empty_ticket()

    # IF THERE ARE NO Offences IN THE DB
    # RETURN None
    if offence == None:
        print('\nNo offences found\n')
        return generate_empty_ticket()
    
    incident = generateIncident(current_datetime(SYS_DATE_FORMAT), current_datetime(SYS_TIME_FORMAT), location, offence, image)
    
    if incident == None:
        return generate_empty_ticket()

    # Convert objects from query results to python dictionaries
    incidentObj = obj_to_dict(incident)
    offenceObj = obj_to_dict(offence)
    locationObj = obj_to_dict(location)

    registrationNumber = '-'
    ticketStatus = ''

    # Parse Image
    try:
        print(f'\nParsing Image: {image}\n')
        registrationNumber = image.split('.')[0]  #parseImage(image)
        print(f'\nRegistrationNumber: {registrationNumber}\n')
    except Exception:
        ticketStatus = 'IMAGE PROCESSING ERROR'

    if ticketStatus == 'IMAGE PROCESSING ERROR':
        ticketData = IPEHandler(incidentObj, offenceObj, locationObj, ticketStatus)
        return ticketData
    else:

        print(f"\nGETTING VEHICLE & VEHICLE OWNER FROM DB")
        # Get Vehicle & Vehicle Owner
        owner = VehicleOwner.query.filter_by(licenseplate=registrationNumber).first()
        print('\nOwner',owner)
        vehicle = Vehicle.query.filter_by(licenseplate=registrationNumber).first()

        # RUN EXCEPTION HANDLER IF Registration # was incorrectly identified
        if owner == None or vehicle == None:
            ticketStatus = 'IMAGE PROCESSING ERROR'
            print(f"\nNO VEHICLE OR VEHICLE OWNER FOUND")
            ticketData = IPEHandler(incidentObj, offenceObj, locationObj, ticketStatus)
            return ticketData

        ownerObj = obj_to_dict(owner)
        vehicleObj = obj_to_dict(vehicle)

        print(f"\nFORMATTING DATA FOR SENDING")
        # Format dates, fine and image path for frontend
        ownerObj['expdate'] = str(ownerObj['expdate'].strftime(USR_DATE_FORMAT))
        vehicleObj['expdate'] = str(vehicleObj['expdate'].strftime(USR_DATE_FORMAT))
        ownerObj['dob'] = str(ownerObj['dob'].strftime(USR_DATE_FORMAT))
        incidentObj['date'] = str(incidentObj['date'].strftime(USR_DATE_FORMAT))
        incidentObj['time'] = str(incidentObj['time'].strftime(USR_TIME_FORMAT))
        imgName = incidentObj['image']
        offenceObj['fine'] = trioFormatter(offenceObj['fine'])

        ticket = None
        imgPath = ''

        # CHECK TO SEE WHETHER OR NOT THE VEHICLE OWNER HAS AN EMAIL ADDRESS ON FILE
        emailAddress = ownerObj['email']
        if emailAddress != '':
            incidentID = incidentObj['id']
            #sendEmail(f'http://localhost:8080/issued/{incidentID}' ,[emailAddress])
            ticketStatus = f"ISSUED VIA ({emailAddress})"
            print(f"\nTICKET STATUS: {ticketStatus}")
            # Create the Ticket and save to JETS' Database/Ticket table
            # Ticket status will determine whether or not the ticket will apprear under the notifications table
            print(f"\nCREATING AN ISSUED TICKET FOR DATABASE")
            ticket = IssuedTicket(ownerObj['trn'], incidentID, datetime.now(), ticketStatus)
            print(f"\nTICKET OBJECT CREATED")
            # SET NEW FILE PATH TO ./uploads/issued
            imgPath = os.path.join(app.config['ISSUED_FOLDER'], imgName)
        else:
            ticketStatus = 'NO EMAIL ADDRESS ON FILE'
            print(f"\nTICKET STATUS: {ticketStatus}")
            print(f"\nCREATING A FLAGGED EMAIL TICKET FOR DATABASE")
            # Create the Ticket and save to JETS' Database/Ticket table
            # Ticket status will determine whether or not the ticket will apprear under the notifications table 
            ticket = FlaggedEmail(ownerObj['trn'], incidentObj['id'], datetime.now(), ticketStatus)
            # SET NEW FILE PATH TO ./uploads/flagged
            imgPath = os.path.join(app.config['FLAGGED_FOLDER'], imgName)

        print(f"\nCOMMITTING TICKET TO DB")
        db_commit(ticket)
        db.session.refresh(ticket)

        #ASSIGN FILE PATH & MOVE FILE FROM ./uploads to ./imgpath
        incidentObj['image'] = imgPath
        os.rename(os.path.join(app.config['UPLOADS_FOLDER'], imgName),imgPath)

        # FORMAT DATE ISSUED
        dateIssued = str(ticket.datetime.strftime(USR_DATETIME_FORMAT))

        ticketData = {
            'vehicleOwner': ownerObj,
            'vehicle': vehicleObj,
            'offence': offenceObj,
            'incident': incidentObj,
            'location': locationObj,
            'status': ticket.status,
            'dateIssued': dateIssued,
            'id': ticket.id
        }
        print(f"\nSENDING DATA TO VIEW...\n")
        return jsonify(ticketData)

###----------- END SIMULATION -----------##

@app.route("/api/issued", methods=["GET"])
@login_required
@requires_auth
def getIssuedTickets():
    """ Get a list of all issued traffic tickets """

    ticketObjs = []
    tickets = db.session.query(IssuedTicket).all()
    if tickets == []:
        print(f'\nNO ISSUED TICKET, SENDING: {tickets}')
        return jsonify(ticketObjs)

    for ticket in tickets:
        ticketID = ticket.id
        ticketData = getIssuedTicket(ticketID).get_json()    #json response to python dict
        ticketObjs.append(ticketData)
    response = jsonify(ticketObjs)
    return response


@app.route("/api/flagged", methods=["GET"])
@login_required
@requires_auth
def getFlaggedTickets():
    """ Get a list of all flagged traffic tickets """

    ticketObjs = []
    tickets = db.session.query(FlaggedEmail).all()
    tickets.extend(db.session.query(FlaggedImage).all())
    if tickets == None:
        return jsonify(ticketObjs)

    for ticket in tickets:
        ticketID = ticket.id
        ticketStatus = ticket.status
        ticketData = getFlaggedTicket(ticketID,ticketStatus).get_json()    #json response to python dict
        ticketObjs.append(ticketData)
    response = jsonify(ticketObjs)
    return response

@app.route("/api/archives", methods=["GET"])
@login_required
@requires_auth
def getArchivedTickets():
    """ Get a list of all archived traffic tickets """

    ticketObjs = []
    tickets = db.session.query(ArchivedTicket).all()
    if tickets == None:
        return jsonify(ticketObjs)

    for ticket in tickets:
        ticketID = ticket.id
        ticketStatus = ticket.status
        ticketData = getArchivedTicket(ticketID,ticketStatus).get_json()    #json response to python dict
        ticketObjs.append(ticketData)
    response = jsonify(ticketObjs)
    return response

'''VIEW ISSUED TICKET WITHOUT BEING LOGGED IN (DEMO)'''
'''USER SHOULD CONFIRM EMAIL ADDRESS BEFORE VIEWING'''
@app.route("/api/issued/<int:ticketID>", methods=["GET"])
# @login_required
# @requires_auth
def getIssuedTicket(ticketID):  # May use either ticketID or incidentID
    """ Get a successfully issued traffic ticket """

    ticket = IssuedTicket.query.get(ticketID)
    if ticket == None:
        ticket = IssuedTicket.query.filter_by(incidentID=ticketID).first()
        print(ticket)
        if ticket == None:
            print('\nTICKET NOT FOUND\n')
            return jsonify({})

    incident = Incident.query.get(ticket.incidentID)
    offence  = Offence.query.get(incident.offenceID)
    location = Location.query.get(incident.locationID)
    owner = VehicleOwner.query.filter_by(trn=ticket.trn).first()
    vehicle = Vehicle.query.filter_by(licenseplate=owner.licenseplate).first()

    # Convert database objects to python dictionaries
    incidentObj = obj_to_dict(incident)
    offenceObj = obj_to_dict(offence)
    locationObj = obj_to_dict(location)
    ownerObj = generateNullVehicleOwner()
    vehicleObj = generateNullVehicle()
    ownerObj = obj_to_dict(owner)
    vehicleObj = obj_to_dict(vehicle)

    # Format data before sending
    ownerObj['expdate'] = str(ownerObj['expdate'].strftime(USR_DATE_FORMAT))
    vehicleObj['expdate'] = str(vehicleObj['expdate'].strftime(USR_DATE_FORMAT))
    ownerObj['dob'] = str(ownerObj['dob'].strftime(USR_DATE_FORMAT))
    ownerObj['trn'] = trioFormatter(ownerObj['trn'], ' ')

    # Format data before sending
    incidentObj['paymentDuration'] = str((incidentObj['date'] + timedelta(offenceObj['paymentDuration'])).strftime(USR_DATE_FORMAT))
    incidentObj['date'] = str(incidentObj['date'].strftime(USR_DATE_FORMAT))
    incidentObj['time'] = str(incidentObj['time'].strftime(USR_TIME_FORMAT))
    incidentObj['image'] = os.path.join(app.config['ISSUED_FOLDER'], incidentObj['image'])[1:]
    offenceObj['fine'] = trioFormatter(offenceObj['fine'])
    
    # FORMAT DATE ISSUED
    dateIssued = str(ticket.datetime.strftime(USR_DATETIME_FORMAT))

    # SET PAYMENT DEADLINE
    paymentDeadline = str((ticket.datetime + timedelta(offenceObj['paymentDuration'])).strftime(USR_DATE_FORMAT))

    return jsonify({
        'vehicleOwner': ownerObj,
        'vehicle': vehicleObj,
        'offence': offenceObj,
        'incident': incidentObj,
        'location': locationObj,
        'dateIssued': dateIssued,
        'paymentDeadline': paymentDeadline,
        'status': ticket.status,
        'id': str(ticket.id).zfill(9)
    })


@app.route("/api/flagged/<int:ticketID>/<ticketStatus>", methods=["GET"])
@login_required
@requires_auth
def getFlaggedTicket(ticketID, ticketStatus):   # May use either ticketID or incidentID
    """ Get a successfully issued traffic ticket """

    ticket = {}

    ownerObj = generateNullVehicleOwner()
    vehicleObj = generateNullVehicle()

    if ticketStatus == 'IMAGE PROCESSING ERROR':
        ticket = FlaggedImage.query.get(ticketID)
        if ticket == None:
            ticket = FlaggedImage.query.filter_by(incidentID=ticketID).first()
            if ticket == None:
                print('\nTICKET NOT FOUND\n')
                return jsonify({})
            
    if ticketStatus == 'NO EMAIL ADDRESS ON FILE':
        ticket = FlaggedEmail.query.get(ticketID)
        if ticket == None:
            ticket = FlaggedEmail.query.filter_by(incidentID=ticketID).first()
            if ticket == None:
                print('\nTICKET NOT FOUND\n')
                return jsonify({})

        owner = VehicleOwner.query.filter_by(trn=ticket.trn).first()
        vehicle = Vehicle.query.filter_by(licenseplate=owner.licenseplate).first()
        ownerObj = obj_to_dict(owner)
        vehicleObj = obj_to_dict(vehicle)

        # Format data before sending
        ownerObj['expdate'] = str(ownerObj['expdate'].strftime(USR_DATE_FORMAT))
        vehicleObj['expdate'] = str(vehicleObj['expdate'].strftime(USR_DATE_FORMAT))
        ownerObj['dob'] = str(ownerObj['dob'].strftime(USR_DATE_FORMAT))
        ownerObj['trn'] = trioFormatter(ownerObj['trn'], ' ')
    
    incident = Incident.query.get(ticket.incidentID)
    offence  = Offence.query.get(incident.offenceID)
    location = Location.query.get(incident.locationID)

    # Convert database objects to python dictionaries
    incidentObj = obj_to_dict(incident)
    offenceObj = obj_to_dict(offence)
    locationObj = obj_to_dict(location)
    
    # Format data before sending
    incidentObj['date'] = str(incidentObj['date'].strftime(USR_DATE_FORMAT))
    incidentObj['time'] = str(incidentObj['time'].strftime(USR_TIME_FORMAT))
    incidentObj['image'] = os.path.join(app.config['FLAGGED_FOLDER'], incidentObj['image'])[1:]
    offenceObj['fine'] = trioFormatter(offenceObj['fine'])
        
    return jsonify({
        'vehicleOwner': ownerObj,
        'vehicle': vehicleObj,
        'offence': offenceObj,
        'incident': incidentObj,
        'location': locationObj,
        'dateIssued': '-',
        'paymentDeadline': '-',
        'status': ticket.status,
        'id': str(ticket.id).zfill(9)
    })

@app.route("/api/archives/<int:ticketID>/<ticketStatus>", methods=["GET"])
@login_required
@requires_auth
def getArchivedTicket(ticketID, ticketStatus):   # May use either ticketID or incidentID
    """ Get a archived traffic ticket """

    ticket = {}

    ownerObj = generateNullVehicleOwner()
    vehicleObj = generateNullVehicle()

    if ticketStatus == 'IMAGE PROCESSING ERROR':
        ticket = ArchivedTicket.query.get(ticketID)
        if ticket == None:
            ticket = ArchivedTicket.query.filter_by(incidentID=ticketID).first()
            if ticket == None:
                print('\nTICKET NOT FOUND\n')
                return jsonify({})
            
        # owner = VehicleOwner.query.filter_by(trn=ticket.trn).first()
        # vehicle = Vehicle.query.filter_by(licenseplate=owner.licenseplate).first()
        # ownerObj = obj_to_dict(owner)
        # vehicleObj = obj_to_dict(vehicle)

        # Format data before sending
        # ownerObj['expdate'] = str(ownerObj['expdate'].strftime(USR_DATE_FORMAT))
        # vehicleObj['expdate'] = str(vehicleObj['expdate'].strftime(USR_DATE_FORMAT))
        # ownerObj['dob'] = str(ownerObj['dob'].strftime(USR_DATE_FORMAT))
        # ownerObj['trn'] = trioFormatter(ownerObj['trn'], ' ')
    
    
    incident = Incident.query.get(ticket.incidentID)
    offence  = Offence.query.get(incident.offenceID)
    location = Location.query.get(incident.locationID)

    # Convert database objects to python dictionaries
    incidentObj = obj_to_dict(incident)
    offenceObj = obj_to_dict(offence)
    locationObj = obj_to_dict(location)
    
    # Format data before sending
    incidentObj['date'] = str(incidentObj['date'].strftime(USR_DATE_FORMAT))
    incidentObj['time'] = str(incidentObj['time'].strftime(USR_TIME_FORMAT))
    incidentObj['image'] = os.path.join(app.config['ARCHIVES_FOLDER'], incidentObj['image'])[1:]
    offenceObj['fine'] = trioFormatter(offenceObj['fine'])

    print(incidentObj['image'])
        
    return jsonify({
        'vehicleOwner': ownerObj,
        'vehicle': vehicleObj,
        'offence': offenceObj,
        'incident': incidentObj,
        'location': locationObj,
        'dateIssued': '-',
        'paymentDeadline': '-',
        'status': ticket.status,
        'id': str(ticket.id).zfill(9)
    })

@app.route("/api/issue/upload", methods=["POST"])
@login_required
@requires_auth
def issue_via_upload():
    """ Add a new offender """

    form = IssueTicketForm()    # TICKET containing all ticket-related data; vehicleowner, vehicle, traffic cam, tax authority

    print('\nReceived Issue Ticket Form')

    print(form)

    if form.validate_on_submit():
        print('\nForm has been validated')
        # include security checks #


        # INCIDENT INFORMATION
        date = request.form['date'].split('-')
        date = datetime(int(date[0]), int(date[1]), int(date[2])).strftime(SYS_DATE_FORMAT)
        print('\nDate:', date)
        time = request.form['time']
        time = f'{time}:00'
        print('\nTime:', time)

        location = request.form['location']
        parish = request.form['parish']

        dbLocation = Location.query.filter_by(description=location).first()
        print('\nFetched Location in DB:', dbLocation)
        if dbLocation is None:
            print('\nCreating new Location in DB')
            location = Location(location, parish)
            db_commit(location)
            db.session.refresh(location)
        else:
            location = dbLocation
        

        offenceCode = request.form['offence']
        offence = Offence.query.filter_by(code=offenceCode).first()


        licensePlateImage = request.files['snapshot']
        imageName = secure_filename(licensePlateImage.filename)
        print('\nSaving image file to uploads dir')
        licensePlateImage.save(os.path.join(app.config['UPLOADS_FOLDER'], imageName))

        # IF THERE ARE NO MORE IMAGES IN THE ./uploads FOLDER
        # RETURN None

        if imageName == None:
            print('\nNO MORE IMAGES TO SERVE\n')
            return generate_empty_ticket()
        
        # IF THERE ARE NO Locations IN THE DB
        # RETURN BLANK None
        if location == None:
            print('\nNo locations found\n')
            return generate_empty_ticket()

        # IF THERE ARE NO Offences IN THE DB
        # RETURN None
        if offence == None:
            print('\nNo offences found\n')
            return generate_empty_ticket()
        
        incident = generateIncident(date, time, location, offence, imageName)
        
        if incident == None:
            return generate_empty_ticket()

        # Convert objects from query results to python dictionaries
        incidentObj = obj_to_dict(incident)
        offenceObj = obj_to_dict(offence)
        locationObj = obj_to_dict(location)

        registrationNumber = '-'
        ticketStatus = ''

        # Parse Image
        try:
            print(f'\nParsing Image: {imageName}\n')
            registrationNumber = imageName.split('.')[0]  #parseImage(imageName)
            print(f'\nRegistrationNumber: {registrationNumber}\n')
        except Exception:
            ticketStatus = 'IMAGE PROCESSING ERROR'

        if ticketStatus == 'IMAGE PROCESSING ERROR':
            ticketData = IPEHandler(incidentObj, offenceObj, locationObj, ticketStatus)
            return ticketData
        else:

            print(f"\nGETTING VEHICLE & VEHICLE OWNER FROM DB")
            # Get Vehicle & Vehicle Owner
            owner = VehicleOwner.query.filter_by(licenseplate=registrationNumber).first()
            print('\nOwner',owner)
            vehicle = Vehicle.query.filter_by(licenseplate=registrationNumber).first()

            # RUN EXCEPTION HANDLER IF Registration # was incorrectly identified
            if owner == None or vehicle == None:
                ticketStatus = 'IMAGE PROCESSING ERROR'
                print(f"\nNO VEHICLE OR VEHICLE OWNER FOUND")
                ticketData = IPEHandler(incidentObj, offenceObj, locationObj, ticketStatus)
                return ticketData

            ownerObj = obj_to_dict(owner)
            vehicleObj = obj_to_dict(vehicle)

            print(f"\nFORMATTING DATA FOR SENDING")
            # Format dates, fine and image path for frontend
            ownerObj['expdate'] = str(ownerObj['expdate'].strftime(USR_DATE_FORMAT))
            vehicleObj['expdate'] = str(vehicleObj['expdate'].strftime(USR_DATE_FORMAT))
            ownerObj['dob'] = str(ownerObj['dob'].strftime(USR_DATE_FORMAT))
            incidentObj['date'] = str(incidentObj['date'].strftime(USR_DATE_FORMAT))
            incidentObj['time'] = str(incidentObj['time'].strftime(USR_TIME_FORMAT))
            imgName = incidentObj['image']
            offenceObj['fine'] = trioFormatter(offenceObj['fine'])

            ticket = None
            imgPath = ''

            # CHECK TO SEE WHETHER OR NOT THE VEHICLE OWNER HAS AN EMAIL ADDRESS ON FILE
            emailAddress = ownerObj['email']
            if emailAddress != '':
                incidentID = incidentObj['id']
                #sendEmail(f'http://localhost:8080/issued/{incidentID}',[emailAddress])
                ticketStatus = f"ISSUED VIA ({emailAddress})"
                print(f"\nTICKET STATUS: {ticketStatus}")
                # Create the Ticket and save to JETS' Database/Ticket table
                # Ticket status will determine whether or not the ticket will apprear under the notifications table
                print(f"\nCREATING AN ISSUED TICKET FOR DATABASE")
                ticket = IssuedTicket(ownerObj['trn'], incidentID, datetime.now(), ticketStatus)
                print(f"\nTICKET OBJECT CREATED")
                # SET NEW FILE PATH TO ./uploads/issued
                imgPath = os.path.join(app.config['ISSUED_FOLDER'], imgName)
            else:
                ticketStatus = 'NO EMAIL ADDRESS ON FILE'
                print(f"\nTICKET STATUS: {ticketStatus}")
                print(f"\nCREATING A FLAGGED EMAIL TICKET FOR DATABASE")
                # Create the Ticket and save to JETS' Database/Ticket table
                # Ticket status will determine whether or not the ticket will apprear under the notifications table 
                ticket = FlaggedEmail(ownerObj['trn'], incidentObj['id'], datetime.now(), ticketStatus)
                # SET NEW FILE PATH TO ./uploads/flagged
                imgPath = os.path.join(app.config['FLAGGED_FOLDER'], imgName)

            print(f"\nCOMMITTING TICKET TO DB")
            db_commit(ticket)
            db.session.refresh(ticket)

            #ASSIGN FILE PATH & MOVE FILE FROM ./uploads to ./imgpath
            incidentObj['image'] = imgPath
            os.rename(os.path.join(app.config['UPLOADS_FOLDER'], imgName),imgPath)

            # FORMAT DATE ISSUED
            dateIssued = str(ticket.datetime.strftime(USR_DATETIME_FORMAT))

            ticketData = {
                'vehicleOwner': ownerObj,
                'vehicle': vehicleObj,
                'offence': offenceObj,
                'incident': incidentObj,
                'location': locationObj,
                'status': ticket.status,
                'dateIssued': dateIssued,
                'id': ticket.id
            }
            print(f"\nSENDING DATA TO VIEW...\n")
            return jsonify(ticketData)
    print('\nForm not validated')
    print(form.errors)
    return generate_empty_ticket()

    
@app.route("/api/issue/flaggedImage", methods=["GET"])
@login_required
@requires_auth
def issueFlaggedImage():

    registrationNumber = request.args.get('registrationNumber')
    ticketID = request.args.get('ticketID')
    print('\nReceived:',registrationNumber, ticketID)
    print(f"\nGETTING VEHICLE & VEHICLE OWNER FROM DB")
    # Get Vehicle & Vehicle Owner
    owner = VehicleOwner.query.filter_by(licenseplate=registrationNumber).first()
    print('\nOwner',owner)
    vehicle = Vehicle.query.filter_by(licenseplate=registrationNumber).first()

    # RUN EXCEPTION HANDLER IF Registration # was incorrectly identified
    if owner == None or vehicle == None:
        print(f"\nNO VEHICLE OR VEHICLE OWNER FOUND")
        return generate_empty_ticket()

    print(f"\nVEHICLE & VEHICLE OWNER FOUND")
    ownerObj = obj_to_dict(owner)
    vehicleObj = obj_to_dict(vehicle)

    currentTicket = getFlaggedTicket(int(ticketID), 'IMAGE PROCESSING ERROR').get_json()
    print('\nTicket Found')

    # Convert objects from query results to python dictionaries
    incidentObj = currentTicket['incident']
    print('\nIncident:',incidentObj)
    offenceObj = currentTicket['offence']
    print('\nOffence:',offenceObj)
    locationObj = currentTicket['location']
    print('\nLocation:',locationObj)

    print(f"\nFORMATTING DATA FOR VIEW")
    # Format dates, fine and image path for frontend
    ownerObj['expdate'] = str(ownerObj['expdate'].strftime(USR_DATE_FORMAT))
    vehicleObj['expdate'] = str(vehicleObj['expdate'].strftime(USR_DATE_FORMAT))
    ownerObj['dob'] = str(ownerObj['dob'].strftime(USR_DATE_FORMAT))
    imgName = incidentObj['image'].split('/')[-1]
    print(f"\nFORMATTING COMPLETE. {imgName}")

    # DECLARE NEW TICKET & IMAGE PATH
    newTicket, imgPath = None, ''

    # CHECK TO SEE WHETHER OR NOT THE VEHICLE OWNER HAS AN EMAIL ADDRESS ON FILE
    emailAddress = ownerObj['email']
    if emailAddress != '':
        incidentID = incidentObj['id']
        #sendEmail(f'http://localhost:8080/issued/{incidentID}',[emailAddress])
        ticketStatus = f"ISSUED VIA ({emailAddress})"
        print(f"\nTICKET STATUS: {ticketStatus}")
        # Create the Ticket and save to JETS' Database/Ticket table
        # Ticket status will determine whether or not the ticket will apprear under the notifications table
        print(f"\nCREATING AN ISSUED TICKET FOR DATABASE")
        newTicket = IssuedTicket(ownerObj['trn'], incidentID, datetime.now(), ticketStatus)
        print(f"\nTICKET OBJECT CREATED")
        # SET NEW FILE PATH TO ./uploads/issued
        imgPath = os.path.join(app.config['ISSUED_FOLDER'], imgName)
    else:
        ticketStatus = 'NO EMAIL ADDRESS ON FILE'
        print(f"\nTICKET STATUS: {ticketStatus}")
        print(f"\nCREATING A FLAGGED EMAIL TICKET FOR DATABASE")
        # Create the Ticket and save to JETS' Database/Ticket table
        # Ticket status will determine whether or not the ticket will apprear under the notifications table 
        newTicket = FlaggedEmail(ownerObj['trn'], incidentObj['id'], datetime.now(), ticketStatus)
        # SET NEW FILE PATH TO ./uploads/flagged
        imgPath = os.path.join(app.config['FLAGGED_FOLDER'], imgName)

    print(f"\nCOMMITTING NEW TICKET TO DB")
    db_commit(newTicket)
    db.session.refresh(newTicket)

    print(f"\nDELETING FLAGGED IMAGE TICKET FROM DB")
    db.session.delete(FlaggedImage.query.get(int(ticketID)))
    db.session.commit()

    #ASSIGN FILE PATH & MOVE FILE FROM ./uploads to ./imgpath
    oldPath = os.path.join(app.config['FLAGGED_FOLDER'], imgName)
    print(f"\nASSIGNING NEW FILE PATH")
    #incidentObj['image'] = imgPath
    print(f"MOVING FILE FROM {oldPath} to {imgPath}")
    os.rename(oldPath,imgPath)

    # FORMAT DATE ISSUED
    dateIssued = str(newTicket.datetime.strftime(USR_DATETIME_FORMAT))

    ticketData = {
        'vehicleOwner': ownerObj,
        'vehicle': vehicleObj,
        'offence': offenceObj,
        'incident': incidentObj,
        'location': locationObj,
        'status': newTicket.status,
        'dateIssued': dateIssued,
        'id': newTicket.id
    }
    print(f"\nSENDING DATA TO VIEW...\n")
    return jsonify(ticketData)

@app.route("/api/issue/flaggedEmail", methods=["GET"])
@login_required
@requires_auth
def issueFlaggedEmail():

    emailAddress = request.args.get('email')
    ticketID = request.args.get('ticketID')
    print('\nReceived:',emailAddress, ticketID)
    print(f"\nGETTING VEHICLE & VEHICLE OWNER FROM DB")

    currentTicket = getFlaggedTicket(int(ticketID), 'NO EMAIL ADDRESS ON FILE').get_json()
    print('\nTicket Found')

    # DECLARE NEW TICKET & IMAGE PATH
    newTicket, newImagePath = None, ''

    # SEND EMAIL
    incident = currentTicket['incident']
    incidentID = incident['id']
    trn = currentTicket['vehicleOwner']['trn'].replace(" ", "") # Remove spaces from formatted trn
    imgName = incident['image'].split('/')[-1]

    sendEmail(f'http://localhost:8080/issued/{incidentID}',[emailAddress])
    ticketStatus = f"ISSUED VIA ({emailAddress})"
    print(f"\nTICKET STATUS: {ticketStatus}")
    # Create the Ticket and save to JETS' Database/Ticket table
    # Ticket status will determine whether or not the ticket will apprear under the notifications table
    print(f"\nCREATING AN ISSUED TICKET FOR DATABASE")
    newTicket = IssuedTicket(trn, incidentID, datetime.now(), ticketStatus)
    print(f"\nTICKET OBJECT CREATED")
    # SET NEW FILE PATH TO ./uploads/issued
    newImagePath = os.path.join(app.config['ISSUED_FOLDER'], imgName)
   

    print(f"\nCOMMITTING NEW TICKET TO DB")
    db_commit(newTicket)
    db.session.refresh(newTicket)

    print(f"\nDELETING FLAGGED EMAIL TICKET FROM DB")
    db.session.delete(FlaggedEmail.query.get(int(ticketID)))
    db.session.commit()

    #ASSIGN FILE PATH & MOVE FILE FROM ./uploads/flagged to ./upload/issued
    oldPath = os.path.join(app.config['FLAGGED_FOLDER'], imgName)
    print(f"MOVING FILE FROM {oldPath} to {newImagePath}")
    os.rename(oldPath,newImagePath)

    # REPLACING OLD TICKET DATA WITH NEW DATA FOR VIEW
    currentTicket['dateIssued'] = str(newTicket.datetime.strftime(USR_DATETIME_FORMAT))
    currentTicket['status'] = newTicket.status
    currentTicket['id'] = newTicket.id

    print(f"\nSENDING DATA TO VIEW...\n")
    return currentTicket

@app.route("/api/issue/archived", methods=["GET"])
@login_required
@requires_auth
def issueArchivedTicket():

    registrationNumber = request.args.get('registrationNumber')
    ticketID = request.args.get('ticketID')
    print('\nReceived:',registrationNumber, ticketID)
    print(f"\nGETTING VEHICLE & VEHICLE OWNER FROM DB")
    # Get Vehicle & Vehicle Owner
    owner = VehicleOwner.query.filter_by(licenseplate=registrationNumber).first()
    print('\nOwner',owner)
    vehicle = Vehicle.query.filter_by(licenseplate=registrationNumber).first()

    # RUN EXCEPTION HANDLER IF Registration # was incorrectly identified
    if owner == None or vehicle == None:
        print(f"\nNO VEHICLE OR VEHICLE OWNER FOUND")
        return generate_empty_ticket()

    print(f"\nVEHICLE & VEHICLE OWNER FOUND")
    ownerObj = obj_to_dict(owner)
    vehicleObj = obj_to_dict(vehicle)

    currentTicket = getArchivedTicket(int(ticketID), 'IMAGE PROCESSING ERROR').get_json()
    print(currentTicket)

    # Convert objects from query results to python dictionaries
    incidentObj = currentTicket['incident']
    print('\nIncident:',incidentObj)
    offenceObj = currentTicket['offence']
    print('\nOffence:',offenceObj)
    locationObj = currentTicket['location']
    print('\nLocation:',locationObj)

    print(f"\nFORMATTING DATA FOR VIEW")
    # Format dates, fine and image path for frontend
    ownerObj['expdate'] = str(ownerObj['expdate'].strftime(USR_DATE_FORMAT))
    vehicleObj['expdate'] = str(vehicleObj['expdate'].strftime(USR_DATE_FORMAT))
    ownerObj['dob'] = str(ownerObj['dob'].strftime(USR_DATE_FORMAT))
    imgName = incidentObj['image'].split('/')[-1]
    print(f"\nFORMATTING COMPLETE. {imgName}")

    # DECLARE NEW TICKET & IMAGE PATH
    newTicket, imgPath = None, ''

    # CHECK TO SEE WHETHER OR NOT THE VEHICLE OWNER HAS AN EMAIL ADDRESS ON FILE
    emailAddress = ownerObj['email']
    if emailAddress != '':
        incidentID = incidentObj['id']
        sendEmail(f'http://localhost:8080/issued/{incidentID}',[emailAddress])
        ticketStatus = f"ISSUED VIA ({emailAddress})"
        print(f"\nTICKET STATUS: {ticketStatus}")
        # Create the Ticket and save to JETS' Database/Ticket table
        # Ticket status will determine whether or not the ticket will apprear under the notifications table
        print(f"\nCREATING AN ISSUED TICKET FOR DATABASE")
        newTicket = IssuedTicket(ownerObj['trn'], incidentID, datetime.now(), ticketStatus)
        print(f"\nTICKET OBJECT CREATED")
        # SET NEW FILE PATH TO ./uploads/issued
        imgPath = os.path.join(app.config['ISSUED_FOLDER'], imgName)
    else:
        ticketStatus = 'NO EMAIL ADDRESS ON FILE'
        print(f"\nTICKET STATUS: {ticketStatus}")
        print(f"\nCREATING A FLAGGED EMAIL TICKET FOR DATABASE")
        # Create the Ticket and save to JETS' Database/Ticket table
        # Ticket status will determine whether or not the ticket will apprear under the notifications table 
        newTicket = FlaggedEmail(ownerObj['trn'], incidentObj['id'], datetime.now(), ticketStatus)
        # SET NEW FILE PATH TO ./uploads/flagged
        imgPath = os.path.join(app.config['FLAGGED_FOLDER'], imgName)

    print(f"\nCOMMITTING NEW TICKET TO DB")
    db_commit(newTicket)
    db.session.refresh(newTicket)

    print(f"\nDELETING ARCHIVED TICKET FROM DB")
    db.session.delete(ArchivedTicket.query.get(int(ticketID)))
    db.session.commit()

    #ASSIGN FILE PATH & MOVE FILE FROM ./uploads to ./imgpath
    oldPath = os.path.join(app.config['ARCHIVES_FOLDER'], imgName)
    print(f"\nASSIGNING NEW FILE PATH")
    #incidentObj['image'] = imgPath
    print(f"MOVING FILE FROM {oldPath} to {imgPath}")
    os.rename(oldPath,imgPath)

    # FORMAT DATE ISSUED
    dateIssued = str(newTicket.datetime.strftime(USR_DATETIME_FORMAT))

    ticketData = {
        'vehicleOwner': ownerObj,
        'vehicle': vehicleObj,
        'offence': offenceObj,
        'incident': incidentObj,
        'location': locationObj,
        'status': newTicket.status,
        'dateIssued': dateIssued,
        'id': newTicket.id
    }
    print(f"\nSENDING DATA TO VIEW...\n")
    return jsonify(ticketData)

@app.route("/api/archives/new", methods=["GET"])
@login_required
@requires_auth
def archiveTicket():

    ticketID = request.args.get('ticketID')
    print('\nReceived:', ticketID)
    print(f"\nGENERATING NULL VEHICLE & VEHICLE OWNER")
    ownerObj = generateNullVehicleOwner()
    vehicleObj = generateNullVehicle()

    currentTicket = getFlaggedTicket(int(ticketID), 'IMAGE PROCESSING ERROR').get_json()
    print('\nTicket Found')

    # Convert objects from query results to python dictionaries
    incidentObj = currentTicket['incident']
    print('\nIncident:',incidentObj)
    offenceObj = currentTicket['offence']
    print('\nOffence:',offenceObj)
    locationObj = currentTicket['location']
    print('\nLocation:',locationObj)

    # print(f"\nFORMATTING DATA FOR VIEW")
    # # Format dates, fine and image path for frontend
    # ownerObj['expdate'] = str(ownerObj['expdate'].strftime(USR_DATE_FORMAT))
    # vehicleObj['expdate'] = str(vehicleObj['expdate'].strftime(USR_DATE_FORMAT))
    # ownerObj['dob'] = str(ownerObj['dob'].strftime(USR_DATE_FORMAT))
    # imgName = incidentObj['image'].split('/')[-1]
    # print(f"\nFORMATTING COMPLETE")

    imgName = incidentObj['image'].split('/')[-1]

    # DECLARE ARCHIVED TICKET & IMAGE PATH
    archivedTicket, imgPath = None, ''

    incidentID = incidentObj['id']
   
    # Create the Ticket and save to JETS' Database/Ticket table
    print(f"\nCREATING AN ARCHIVED TICKET FOR DATABASE")
    archivedTicket = ArchivedTicket(incidentID, datetime.now(), currentTicket['status'])
    print(f"\nTICKET OBJECT CREATED")
    # SET NEW FILE PATH TO ./uploads/archives
    imgPath = os.path.join(app.config['ARCHIVES_FOLDER'], imgName)


    print(f"\nCOMMITTING NEW TICKET TO DB")
    db_commit(archivedTicket)
    db.session.refresh(archivedTicket)

    print(f"\nDELETING FLAGGED IMAGE TICKET FROM DB")
    db.session.delete(FlaggedImage.query.get(int(ticketID)))
    db.session.commit()

    #ASSIGN FILE PATH & MOVE FILE FROM ./uploads to ./imgpath
    oldPath = os.path.join(app.config['FLAGGED_FOLDER'], imgName)
    print(f"MOVING FILE FROM {oldPath} to {imgPath}")
    os.rename(oldPath,imgPath)

    # FORMAT DATE ARCHIVED
    dateArchived = str(archivedTicket.datetime.strftime(USR_DATETIME_FORMAT))

    ticketData = {
        'vehicleOwner': ownerObj,
        'vehicle': vehicleObj,
        'offence': offenceObj,
        'incident': incidentObj,
        'location': locationObj,
        'status': archivedTicket.status,
        'dateArchived': dateArchived,
        'paymentDeadline': '-',
        'id': archivedTicket.id
    }
    print(f"\nSENDING DATA TO VIEW...\n")
    return jsonify(ticketData)

@app.route("/api/search/tickets", methods=["GET"])
@login_required
@requires_auth
def searchTickets():
    """ Search for offenders based on their name, date of offence or ticket status """

    query = request.args.get('q')   # Get the query param 'q' from the request object
    print('\nQuery Param:', query)

    tickets = []
    print('\nSearching by trn')
    tickets.extend(search_by_trn(query))

    # IF NOT FOUND USING TRN - TRY REGISTRATION #
    if len(tickets) == 0:
        print('\nSearching by reg #')
        tickets.extend(search_by_reg_no(query))

        # IF NOT FOUND USING REGISTRATION # - TRY OFFENCE
        if len(tickets) == 0:
            print('\nSearching by offence')
            tickets.extend(search_by_offence(query))

            # IF NOT FOUND USING OFFENCE- TRY LOCATION
            if len(tickets) == 0:
                print('\nSearching by location')
                tickets.extend(search_by_location(query))

                # IF NOT FOUND USING OFFENCE- TRY LOCATION
                if len(tickets) == 0:
                    print('\nSearching by date and time')
                    tickets.extend(search_by_datetime(query))

    print(tickets)
    ticketObjs = []
    for ticket in tickets:
        ticketID = ticket.id
        ticketStatus = ticket.status
        if ticketStatus.startswith('ISSUED'):
            ticketData = getIssuedTicket(ticketID).get_json()    #json response obj to python dict
        else:
            ticketData = getFlaggedTicket(ticketID, ticketStatus).get_json()    #json response obj to python dict
        
        ticketObjs.append(ticketData)
    
    response = jsonify(ticketObjs)

    print('\nSearch Results:', response)
    return response


@app.route("/api/users/<int:user_id>", methods=["GET"])
@login_required
def getUser(user_id):
    """ Get details for a specific user """
    if str(user_id) != current_user.get_id():
        return jsonify(message="Invalid Request")

    user = User.query.get(user_id)
    if user is None:
        return jsonify(message="User not found")
    
    user = obj_to_dict(user)
    user.pop('password')
    return jsonify(user)

@app.route("/api/users/changePassword", methods=["POST"])
@login_required
@requires_auth
def changePassword():
    """ Change password for a specified user """

    print('\nChange Password Form Received')
    form = ChangePasswordForm()

    #print(request.form['userID'], request.form['oldPassword'], request.form['newPassword'])
    if form.validate_on_submit():
        print('\nForm has been validated')

        userID = request.form['userID']
        oldPassword = request.form['oldPassword']
        newPassword = request.form['newPassword']

        # Verify user
        if userID != current_user.get_id():
            return jsonify(message="Invalid Request")

        # db access
        user = User.query.get(userID)
        if user is None:
            return jsonify(message="User not found")

        message = ''
        # Verify the password 
        if check_password_hash(user.password, oldPassword + user.salt):
            user.setPassword(newPassword) # Verify SQL injection not possible
            db_commit(user) # Save updated changes
            message = 'Password successfully changed'
            print('\n{message}')
            return jsonify(message=message)
        else:
            message = 'Incorrect password'
            print('\n{message}')
            return jsonify(message=message)
    else:
        print('\nForm could not be validated')
        response = jsonify(form.errors)
        return response

@app.route('/uploads/<filename>')
def get_new_upload(filename):
    print('GETTING FILE FROM UPLOADS_FOLDER')
    root_dir = os.getcwd()
    return send_from_directory(os.path.join(root_dir, app.config['UPLOADS_FOLDER']),filename)

@app.route('/uploads/issued/<filename>')
def get_issued_upload(filename):
    print('GETTING FILE FROM ISSUED_FOLDER')
    root_dir = os.getcwd()
    return send_from_directory(os.path.join(root_dir, app.config['ISSUED_FOLDER']),filename)

@app.route('/uploads/flagged/<filename>')
def get_flagged_upload(filename):
    print('GETTING FILE FROM FLAGGED_FOLDER')
    root_dir = os.getcwd()
    return send_from_directory(os.path.join(root_dir, app.config['FLAGGED_FOLDER']),filename)

@app.route('/uploads/archives/<filename>')
def get_archived_upload(filename):
    print('GETTING FILE FROM ARCHIVES_FOLDER')
    root_dir = os.getcwd()
    return send_from_directory(os.path.join(root_dir, app.config['ARCHIVES_FOLDER']),filename)

########## --------- HELPER FUNCTIONS --------- ###########

## SEARCHING ##

def search_by_trn(trn):
    # Return all issued and flagged email tickets where trn is param 'trn'
    tickets = []
    results = IssuedTicket.query.filter_by(trn=trn).all()
    tickets.extend(results)

    results = FlaggedEmail.query.filter_by(trn=trn).all()
    tickets.extend(results)
    return tickets

def search_by_reg_no(registrationNumber):
    tickets = []
    # Return all issued and flagged email tickets where Vehicle registration number is param 'registrationNumber'
    trns = db.session.query(VehicleOwner.trn).filter(VehicleOwner.licenseplate==registrationNumber).subquery() # Get trn using reg #
    issued = db.session.query(IssuedTicket).filter(IssuedTicket.trn.in_(trns)) # Get issued tickets using trn from trns
    flaggedEmails = db.session.query(FlaggedEmail).filter(FlaggedEmail.trn.in_(trns)) # Get flagged email tickets using trn from trns
    tickets.extend(issued)
    tickets.extend(flaggedEmails)
    return tickets

def search_by_offence(code_or_desc):
    tickets = []
    offence = Offence.query.filter_by(code=code_or_desc).first()    # Get the first offence with 'code' matching 'code_or_desc'
    if offence:
        print('\nOffence found by code')
        incidentIDs = db.session.query(Incident.id).filter(Incident.offenceID == offence.code).subquery() # Get incidentID using offenceID from offence
        issued = db.session.query(IssuedTicket).filter(IssuedTicket.incidentID.in_(incidentIDs)) # Get issued tickets using incidentID from incidentIDs
        flaggedEmails = db.session.query(FlaggedEmail).filter(FlaggedEmail.incidentID.in_(incidentIDs)) # Get flagged email tickets using incidentID from incidentIDs
        flaggedImages = db.session.query(FlaggedImage).filter(FlaggedImage.incidentID.in_(incidentIDs)) # Get flagged image tickets using incidentID from incidentIDs
        tickets.extend(issued)
        tickets.extend(flaggedEmails)
        tickets.extend(flaggedImages)
        return tickets

    print('\nSearching by offence description')
    # OFFENCE NOT FOUND BY CODE - SEARCH BY DESCRIPTION
    offenceCodes = db.session.query(Offence.code).filter(Offence.description.like(f'%{code_or_desc}%')).subquery() # Get code using description
    incidentIDs = db.session.query(Incident.id).filter(Incident.offenceID.in_(offenceCodes)).subquery() # Get incidentID using offenceID from offenceCodes
    issued = db.session.query(IssuedTicket).filter(IssuedTicket.incidentID.in_(incidentIDs)) # Get issued tickets using incidentID from incidentIDs
    flaggedEmails = db.session.query(FlaggedEmail).filter(FlaggedEmail.incidentID.in_(incidentIDs)) # Get flagged email tickets using incidentID from incidentIDs
    flaggedImages = db.session.query(FlaggedImage).filter(FlaggedImage.incidentID.in_(incidentIDs)) # Get flagged image tickets using incidentID from incidentIDs
    tickets.extend(issued)
    tickets.extend(flaggedEmails)
    tickets.extend(flaggedImages)
    return tickets
 
def search_by_location(parish_or_desc):
    tickets = []

    locationIDs = db.session.query(Location.id).filter(Location.parish.like(f'%{parish_or_desc}%')).subquery() #
    incidentIDs = db.session.query(Incident.id).filter(Incident.locationID.in_(locationIDs)).subquery() # Get incidentIDs using locationID from location
    issued = db.session.query(IssuedTicket).filter(IssuedTicket.incidentID.in_(incidentIDs)) # Get issued tickets using incidentID from incidentIDs
    flaggedEmails = db.session.query(FlaggedEmail).filter(FlaggedEmail.incidentID.in_(incidentIDs)) # Get flagged email tickets using incidentID from incidentIDs
    flaggedImages = db.session.query(FlaggedImage).filter(FlaggedImage.incidentID.in_(incidentIDs)) # Get flagged image tickets using incidentID from incidentIDs
    tickets.extend(issued)
    tickets.extend(flaggedEmails)
    tickets.extend(flaggedImages)
    if len(tickets) > 0:
        print('\nFound by parish')
        return tickets

    print('\nNo records found by parish. Searching by desc')
    # LOCATION NOT FOUND BY PARISH - SEARCH BY DESCRIPTION
    locations = db.session.execute(f"select * from Location where description like '%{parish_or_desc}%'")
    for location in locations:
        incidents = Incident.query.filter_by(locationID=location['id']).all()    # all incidents having locationID = parish_or_desc
        for incident in incidents:
            issued = db.session.query(IssuedTicket).filter(IssuedTicket.incidentID==incident.id).all() # Get issued tickets using incidentID from incidentIDs
            flaggedEmails = db.session.query(FlaggedEmail).filter(FlaggedEmail.incidentID==incident.id).all() # Get flagged email tickets using incidentID from incidentIDs
            flaggedImages = db.session.query(FlaggedImage).filter(FlaggedImage.incidentID==incident.id).all() # Get flagged image tickets using incidentID from incidentIDs
    
    tickets.extend(issued)
    tickets.extend(flaggedEmails)
    tickets.extend(flaggedImages)
    return tickets

def search_by_datetime(datetime):
    tickets = []

    #locationIDs = db.session.query(Location.id).filter(Location.parish.like(f'%{parish_or_desc}%')).subquery() #
    incidentIDs = db.session.query(Incident.id).filter(Incident.date.like(f'%{datetime}%')).subquery() # Get incidentIDs using datetime
    issued = db.session.query(IssuedTicket).filter(IssuedTicket.incidentID.in_(incidentIDs)) # Get issued tickets using incidentID from incidentIDs
    flaggedEmails = db.session.query(FlaggedEmail).filter(FlaggedEmail.incidentID.in_(incidentIDs)) # Get flagged email tickets using incidentID from incidentIDs
    flaggedImages = db.session.query(FlaggedImage).filter(FlaggedImage.incidentID.in_(incidentIDs)) # Get flagged image tickets using incidentID from incidentIDs
    tickets.extend(issued)
    tickets.extend(flaggedEmails)
    tickets.extend(flaggedImages)
    if len(tickets) > 0:
        print('\nFound by date')
        return tickets

    print('\nNo records found by date. Searching by time')

    incidents = db.session.execute(f"select * from Incident where time like '%{datetime}%'")
    for incident in incidents:
        issued = db.session.query(IssuedTicket).filter(IssuedTicket.incidentID==incident.id).all() # Get issued tickets using incidentID from incidentIDs
        flaggedEmails = db.session.query(FlaggedEmail).filter(FlaggedEmail.incidentID==incident.id).all() # Get flagged email tickets using incidentID from incidentIDs
        flaggedImages = db.session.query(FlaggedImage).filter(FlaggedImage.incidentID==incident.id).all() # Get flagged image tickets using incidentID from incidentIDs

    tickets.extend(issued)
    tickets.extend(flaggedEmails)
    tickets.extend(flaggedImages)
    return tickets

## END SEARCH ##

@app.route('/api/resetSimulation', methods=["GET"])
@requires_auth
def resetSimulation():
    print('\nRESETTING SIMULATION')
    try:
        reset_uploads_dir()
        print('\nClearing DB tables'.upper())
        clear_db_table(IssuedTicket)
        clear_db_table(FlaggedImage)
        clear_db_table(FlaggedEmail)
        clear_db_table(ArchivedTicket)
        clear_db_table(Incident)
        print('\n')
        return jsonify({'message':'Simulation data has been reset'})
    except Exception as e:
        print(e)
        return jsonify({'message':'An error occurred while resetting simulation'})

def reset_uploads_dir():
    '''Move flagged and issued files to uploads directory'''

    print('RESETTING DIRECTORIES')
    flagged = app.config['FLAGGED_FOLDER']
    issued = app.config['ISSUED_FOLDER']
    archives = app.config['ARCHIVES_FOLDER']
    uploads = app.config['UPLOADS_FOLDER']

    files = getFilenames(flagged)
    print('Flagged Files',files)
    if files != []:
        print('\nMoving files from flagged folder to uploads folder')
        # Move files from flagged folder to uploads folder
        for file in files:
            if file != '.gitkeep':
                print(f'\t{file}')
                os.rename(os.path.join(flagged, file), os.path.join(uploads, file))
    else:
        print(f'\nFlagged folder is empty!')  

    files = getFilenames(issued)
    print('Issued Files',files)
    if files != []:
        print('\nMoving files from issued folder to uploads folder')
        # Move files from issued folder to uploads folder
        for file in files:
            if file != '.gitkeep':
                print(f'\t{file}')
                os.rename(os.path.join(issued, file), os.path.join(uploads, file))
        print('\nMoved files from issued folder to uploads folder')
    else:
        print(f'\nIssued folder is empty!')  

    # files = getFilenames(archives)
    # if files != []:
    #     print('\nMoving files from archives folder to uploads folder')
    #     # Move files from issued folder to uploads folder
    #     for file in files:
    #         print(f'\t{file}')
    #         os.rename(os.path.join(archives, file), os.path.join(uploads, file))
    #     print('\nMoved files from archives folder to uploads folder')
    # else:
    #     print(f'\nArchives folder is empty!')  

def clear_db_table(table):
    results = db.session.query(table).all()
    if results != []:
        print('\n\tClearing DB table:', table)
        for result in results:
            print(f'\t{result}')
            db.session.delete(result)
            db.session.commit()
    else:
        print(f'\tTable {table} is empty!')  

def getFilenames(path):
    '''Returns a list of filenames within the given file path'''

    files = []
    for (dirpath, dirnames, filenames) in os.walk(path):
        print('Filenames', filenames)
        print('Dir path', dirpath)
        print('Dir names', dirnames)
        files.extend(filenames)
        return files

def get_random_file(path):
    '''Returns a randomly selected filename from the given file path'''
    '''Returns None if the directory is empty'''

    images = getFilenames(path)

    if images == []:
        return None
    return random.choice(images)

def get_random_record(db_table):
    '''Returns a randomly selected record from the given table'''
    '''Returns None if the table is empty'''

    records  = db.session.query(db_table).all() # List of records within the given table
    if records == []:
        return None
    return random.choice(records)  # Return a random choice

def generate_empty_ticket():
    '''Returns Ticket attributes with empty values'''

    return {
            'vehicleOwner': '',
            'vehicle': '',
            'offence': '',
            'incident': '',
            'location': '',
            'status': '',
            'dateFlagged': '',
            'id': '#'
        }

def db_commit(record):
    '''Commits the given record to the DB'''
    db.session.add(record)
    db.session.commit()

# FOR GENERATING AND SAVING AN INCIDENT TO THE DB
def generateIncident(date, time, location, offence, image):
    '''Stores and Returns a new Incident having the given fields'''
   
    try:
        print('\nGenerating new Incident')
        # CREATE A NEW INCIDENT
        incident = Incident(date, time, location.id, offence.code, image)

        # SAVE NEW INCIDENT TO DB
        db_commit(incident)

        return incident
    except Exception:
        print('\nAn exception occurred!\n')
        return None

def sendEmail(message, recipients, offence=''):
    # Prepare and send email
    msg = Message('Committing a Traffic Offence', sender=('JamaicaEye Ticketing System',
    'traffic.division@jcf.gov.jm'),recipients=recipients)
    msg.body = 'You are hereby charged for having committed the offence described within the e-ticket found at:\n\n'
    msg.body += message + '\n\n'
    msg.body += 'You may optionally print this traffic ticket using your web browser\'s native print function.\n\n'
    msg.body += 'Should you have any queries, kindly direct them to jets.queries@jcf.gov.jm.\n'
    mail.send(msg)
    print('\nEmail has been delivered to:', recipients[0],'\n')


def parseImage(image):
    registrationNumber = LPDetector(image)
    registrationNumber = ''.join(e for e in registrationNumber if e.isalnum())
    return registrationNumber


# For handling IMAGE PROCESSING EXCEPTIONS (IPE)
def IPEHandler(incidentObj, offenceObj, locationObj, ticketStatus):
    print("\nRUNNING EXCEPTION HANDLER")
    # Generate a Vehicle and a Vehicle Owner with empty attribute values
    vehicleObj = generateNullVehicle()
    ownerObj = generateNullVehicleOwner()

    # Format dates, fine and image path for frontend
    incidentObj['date'] = str(incidentObj['date'].strftime(USR_DATE_FORMAT))
    incidentObj['time'] = str(incidentObj['time'].strftime(USR_TIME_FORMAT))
    offenceObj['fine'] = trioFormatter(offenceObj['fine'])
    imgName = incidentObj['image']

    # Create a 'FLAGGED IMAGE' Ticket and save to JETS' Database, ie. FlaggedImage table
    # Ticket status will determine whether or not the ticket will apprear under the notifications table
    print(f'\nTICKET STATUS: {ticketStatus}')
    ticket = FlaggedImage(incidentObj['id'], datetime.now(), ticketStatus)

    try:
        db_commit(ticket)
        db.session.refresh(ticket)
    except Exception:
        print(f'\nERROR SAVING FLAGGED IMAGE TO DB, MAYBE DUPLICATE INCIDENT ID')

    print(f'A FlaggedImage Ticket was added: {ticket}')

    # ASSIGN NEW FILE PATH & MOVE FILE
    incidentObj['image'] = os.path.join(app.config['FLAGGED_FOLDER'], imgName)
    os.rename(os.path.join(app.config['UPLOADS_FOLDER'], imgName),os.path.join(app.config['FLAGGED_FOLDER'], imgName))
    
    # FORMAT DATE FLAGGED
    dateFlagged = str(ticket.datetime.strftime(USR_DATETIME_FORMAT))
    
    ticketData = {
        'vehicleOwner': ownerObj,
        'vehicle': vehicleObj,
        'offence': offenceObj,
        'incident': incidentObj,
        'location': locationObj,
        'status': ticket.status,
        'dateFlagged': dateFlagged,
        'id': ticket.id
    }

    return jsonify(ticketData)


def generateNullVehicleOwner():
    # Generate a Vehicle Owner with empty attribute values
    return {
        'trn': '-',
        'fname': '-',
        'lname': ' ',
        'mname': '-',
        'address':'-',
        'country': '-',
        'parish': '-',
        'email':'-',
        'dob': '-',
        'gender':'-',
        'licenseplate': '-',
        'licensein': '-',
        'expdate': '-',
        'licenseType' :'-'
    }

def generateNullVehicle():
    # Generate a Vehicle with empty attribute values
    return {
        'licenseplate': '-',
        'make': '-',
        'model': '-',
        'colour' : '-',
        'year': '-',
        'licensediscno': '-',
        'cartype': '-',
        'expdate': '-'
    }

# Please create all new routes and view functions above this route.
# This route is now our catch all route for our VueJS single page
# application.
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def index(path):
    """
    Because we use HTML5 history mode in vue-router we need to configure our
    web server to redirect all routes to index.html. Hence the additional route
    "/<path:path".

    Also we will render the initial webpage and then let VueJS take control.
    """
    return render_template('index.html')


# user_loader callback. This callback is used to reload the user object from
# the user ID stored in the session
@login_manager.user_loader
def load_user(id):
    return User.query.get(int(id))

# Flash errors from the form if validation fails with Flask-WTF
# http://flask.pocoo.org/snippets/12/
def flash_errors(form):
    for field, errors in form.errors.items():
        for error in errors:
            msg = f"Error in the {getattr(form, field).label.text} field - {error}"
            flash(msg, 'danger')
            


###
# Utilities
###

def current_datetime(format="%b %d, %Y %I:%M %p"):
    return datetime.now().strftime(format)

def obj_to_dict(obj):
    '''Converts an sqlalchemy database object to a dictionary format'''
    data = {}
    try:    # obj may not have an id property
        data = {'id':obj.get_id()}
    except Exception:
        pass
    parish= db.Column(db.String(30), nullable=False)
    email= db.Column(db.String(60), nullable=False)

    try:
        for k, v in obj.__dict__.items():
            if k != '_sa_instance_state':
                data[k] = v
    except Exception:
        pass

    return data

def trnFormatter(trn, sep=' '):
    trn = str(trn)
    new_trn = ''
    for i in range(len(trn)):
        new_trn += trn[i]
        if (i+1) % 3 == 0:
            new_trn += sep
    return new_trn

def trioFormatter(price, sep=','):
    '''Formats a number to include a thousandths separator'''
    price = str(price)
    pos = price.find('.') 
    if pos > 0:
        price = price[:pos]
    priceLength = len(price)
    commaPosition = priceLength % 3
    if commaPosition == 0:
        commaPosition += 3
    formattedPrice = ""  
    for i in range(0, priceLength):
        if i == commaPosition:
            formattedPrice += (sep)
            commaPosition += 3
        formattedPrice += price[i]
    return formattedPrice


# A function to populate the database with fake data
def populateDatabase():
    '''DATABASE INSERTS'''

    print('\nPOPULATING USER DB...\n')


    admin = User('Damion Lawson','admin','True')

    officer1 = User('Chris Russell','password123')
    officer2 = User('Andrew Black','password123')

    db.session.add(admin)
    

    vehicle1 = Vehicle('9518JK', 'Toyota', 'Belta', 'White', 2009, 'JV390145', 'Sedan', '2022-07-11')
    vehicleOwner1 = VehicleOwner('234351389','Anne','Arden','Ramirez','58 Killarney Rd, Ocho Rios','St.Ann','Jamaica','anne.ramirez@gmail.com','1985-5-21','Female','9518JK','Jamaica','2024-09-25','General')

    vehicle2 = Vehicle('8424GR','Toyota','Mark II Tourier','Silver',2003,'CJ128912','Sedan','2022-09-20')
    vehicleOwner2 = VehicleOwner('168858869','Michael','Nash','Rice','41 Angels Walks Rd, Spanish Town','St. Catherine','Jamaica','michael.nash@yahoo.com','1991-10-11','Male','8424GR','Jamaica','2025-10-07','General')

    vehicle3 = Vehicle('9579JP','Nissan','Tiida','Red',2006,'MK105873','Sedan','2022-08-10')
    vehicleOwner3 = VehicleOwner('123077859','Jamie','Isaiah','Campbell','13 Mutex Ave, Maypen','Clarendon','Jamaica','jamie.campbell876@gmail.com','1983-07-15','Male','9579JP','Jamaica','2023-01-09','General')

    vehicle4 = Vehicle('2445GX','Toyota','Carolla','Silver',2002,'AB781003','Sedan','2022-04-11')
    vehicleOwner4 = VehicleOwner('103975746','Navuna','Marcia','Evans','33 Watson Street, Mandeville','Manchester','Jamaica','navuna_evans@hotmail.com','1989-12-15','Female','2445GX','Jamaica','2023-01-18','Private')

    vehicle5 = Vehicle('1206FQ','Toyota','Fortuner','Blue',2007,'RM125548','SUV','2022-06-11')
    vehicleOwner5 = VehicleOwner('281590140','Willesly','Jehory','Durant','4 Johns Ave, Molynes Rd, Kingston 11','Kingston','Jamaica','willesly.durant@gmail.com','2000-11-11','Male','1206FQ','Jamaica','2022-05-14','Private')

    vehicle6 = Vehicle('6606HW','Toyota','Carolla','Black',1996,'KL323654','Sedan','2022-06-08')
    vehicleOwner6 = VehicleOwner('267041347','Venice','Anika','Salmon','28 Reeves Ave, Graham Rd, Kingston 12','Kingston','Jamaica','venice.salmon28@gmail.com','2001-10-18','Female','6606HW','Jamaica','2022-05-14','General')

    vehicle7 = Vehicle('3840GF','Toyota','Fielder','Black',2004,'LP830547','Sedan','2022-02-07')
    vehicleOwner7 = VehicleOwner('185671235','Kevin','Jamie','Bullock','28 West Minister Ave, Garnett Rd, Kingston 3','Kingston','Jamaica','','1995-10-28','Male','3840GF','Jamaica','2024-08-19','General')

    vehicle8 = Vehicle('4737HA','Toyota','Prado','Silver',2013,'PT124785','SUV','2022-08-01')
    vehicleOwner8 = VehicleOwner('141158951','Carlton','Omar','Stevens','46 Walkers Dr, Orange Rd, Barbican','Kingston','Jamaica','carlton_stevens11@yahoo.com','1985-12-27','Male','4737HA','Jamaica','2024-08-29','General')
    
    vehicle9 = Vehicle('PK0587','Toyota','Fielder','Black',2015,'AU219303','Wagon','2022-09-29')
    vehicleOwner9 = VehicleOwner('205810467','Kadisha','Anita','Baker','7 Hopewell Road, Lucea','Hanover','Jamaica','kadisha.baker28@yahoo.com','1982-02-25','Female','PK0587','Jamaica','2023-04-30','General')

    vehicle10 = Vehicle('2926JC','Honda','Accord','Black',2017,'MA742013','Sedan','2022-06-04')
    vehicleOwner10 = VehicleOwner('187511069','Alvin','Orandi','Green','44 Prosper Road, Grandville','St. Thomas','Jamaica','','1999-03-20','Male','2926JC','Jamaica','2023-05-10','Private')


    db.session.add(vehicle1)
    db.session.add(vehicle2)
    db.session.add(vehicle3)
    db.session.add(vehicle4)
    db.session.add(vehicle5)
    db.session.add(vehicle6)
    db.session.add(vehicle7)
    db.session.add(vehicle8)
    db.session.add(vehicle9)
    db.session.add(vehicle10)

    db.session.commit()
    print('ADDED ADMIN, OFFICERS & VEHICLES TO DATABASE!')
    
    offence1 = Offence('Exceeding the speed limit > 10 kmph', 'E200', 500, 1, 60)
    offence2 = Offence('Exceeding the speed limit > 50 kmph', 'E300', 7000, 4, 60)
    offence3 = Offence('Exceeding the speed limit > 80 kmph', 'E400', 10000, 7, 60)
    offence4 = Offence('Failure to obey traffic signal', 'F100', 5000, 3, 60)
    db.session.add(offence1)
    db.session.add(offence2)
    db.session.add(offence3)
    db.session.add(offence4)
    db.session.add(vehicleOwner1)
    db.session.add(vehicleOwner2)
    db.session.add(vehicleOwner3)
    db.session.add(vehicleOwner4)
    db.session.add(vehicleOwner5)
    db.session.add(vehicleOwner6)
    db.session.add(vehicleOwner7)
    db.session.add(vehicleOwner8)
    db.session.add(vehicleOwner9)
    db.session.add(vehicleOwner10)


    db.session.commit()
    print('ADDED OFFENCES & VEHICLE OWNERS TO DB!')

    location1 = Location('27 Constant Spring Road, Kingston 3', 'Kingston')
    location2 = Location('48 Old Hope Road, Kingston 7', 'Kingston')
    location3 = Location('9 Darling Street, Kingston 13', 'Kingston')
    location4 = Location('12B Mona Road, Kingston 5', 'Kingston')
    location5 = Location('7 Grande Road, Kingston 3', 'Kingston')
    location6 = Location('1 Ardenne Road, Kingston 8', 'Kingston')
    location7 = Location('3 Molynes Road, Kingston 4', 'Kingston')

    
    db.session.add(location1)
    db.session.add(location2)
    db.session.add(location3)
    db.session.add(location4)
    db.session.add(location5)
    db.session.add(location6)
    db.session.add(location7)

    db.session.commit()
    print('ADDED LOCATIONS TO DB!')

    cam1 = TrafficCam('F100',1)   # valid offences & location
    cam2 = TrafficCam('F100',2)   # valid offences & location
    cam3 = TrafficCam('F100',3)   # valid offences & location
    cam4 = TrafficCam('F100',4)   # valid offences & location
    cam5 = TrafficCam('F100',7)   # valid offences & location
    cam6 = TrafficCam('E200 E300 E400',6)   # valid offences & location
    cam7 = TrafficCam('E200 E300 E400',5)   # valid offences & location
    db.session.add(cam1)
    db.session.add(cam2)
    db.session.add(cam3)
    db.session.add(cam4)
    db.session.add(cam5)
    db.session.add(cam6)
    db.session.add(cam7)

    db.session.commit()

    print('ADDED TRAFFIC CAMS TO THE DB!')

    print('\nUSER DB HAS BEEN POPULATED...\n')

###
# The functions below should be applicable to all Flask apps.
###

@app.route('/<file_name>.txt')
def send_text_file(file_name):
    """Send your static text file."""
    file_dot_text = file_name + '.txt'
    return app.send_static_file(file_dot_text)


@app.after_request
def add_header(response):
    """
    Add headers to both force latest IE rendering engine or Chrome Frame,
    and also to cache the rendered page for 10 minutes.
    """
    response.headers['X-UA-Compatible'] = 'IE=Edge,chrome=1'
    response.headers['Cache-Control'] = 'public, max-age=0'
    return response


# @app.errorhandler(404)
# def page_not_found(error):
#     """Custom 404 page."""
#     return render_template('404.html'), 404


if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port="8080")
