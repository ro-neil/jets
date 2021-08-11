from . import db
from werkzeug.security import generate_password_hash
from flask_login._compat import unicode
import random as r

'''JETS API'''
class User(db.Model):
    __tablename__ = 'User'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(32), unique=True)
    password = db.Column(db.String(255), nullable=False)
    salt = db.Column(db.String(64), nullable=False)
    isAdmin = db.Column(db.String(5), nullable=False)   # True of False

    def __init__(self, username, password, isAdmin='False'):
        self.username = username
        self.salt = SaltGenerator.string(64)
        self.setPassword(password)
        self.isAdmin = isAdmin
    
    def is_authenticated(self):
        return True

    def is_active(self):
        return True

    def is_anonymous(self):
        return False

    def get_id(self):
        try:
            return unicode(self.id)  # python 2 support
        except NameError:
            return str(self.id)  # python 3 support

    def is_admin(self):
        if self.isAdmin == "True":
            return True
        return False

    def __repr__(self):
        return '<User %r>' % (self.username)

    def setPassword(self, password):
        self.password = generate_password_hash(password + self.salt, method='pbkdf2:sha256')

'''JETS API'''
class Incident(db.Model):
    __tablename__ = 'Incident'

    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False)   # TRAFFIC CAM API
    time = db.Column(db.Time, nullable=False)   # TRAFFIC CAM API
    locationID = db.Column(db.Integer, db.ForeignKey('Location.id'), nullable=False)    # TRAFFIC CAM API
    offenceID = db.Column(db.String(4), db.ForeignKey('Offence.code'), nullable=False)  # TRAFFIC CAM API / # TAX AUTHORITY API
    image = db.Column(db.String(50), nullable=False)   # TRAFFIC CAM API


    def __init__(self, date, time, locationID, offenceID, imageName):
        self.date = date
        self.time = time
        self.locationID = locationID
        self.offenceID = offenceID
        self.image = imageName

    def get_id(self):
        try:
            return unicode(self.id)  # python 2 support
        except NameError:
            return str(self.id)  # python 3 support

    def __repr__(self):
        return '<Incident %r %r>' % (self.id, self.image)

'''JETS API'''
class IssuedTicket(db.Model):   # add payment deadline to IssuedTicket
    __tablename__ = 'IssuedTicket'

    id = db.Column(db.Integer, primary_key=True)
    trn = db.Column(db.String(10), db.ForeignKey('VehicleOwner.trn'), nullable=False)
    incidentID = db.Column(db.Integer, db.ForeignKey('Incident.id'), nullable=False, unique=True)
    datetime = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(70), nullable=False)
    #paymentDeadline = db.Column(db.DateTime, nullable=False)

    def __init__(self, trn, incidentID, datetimeIssued, status):
        self.trn = trn
        self.incidentID = incidentID
        self.datetime = datetimeIssued
        self.status = status
        #self.paymentDeadline = paymentDeadline
 
    def get_id(self):
        try:
            return unicode(self.id)  # python 2 support
        except NameError:
            return str(self.id)  # python 3 support

    def __repr__(self):
        return '<IssuedTicket %r %r %r>' % (self.id, self.trn, self.status)

'''JETS API'''
class FlaggedEmail(db.Model):
    __tablename__ = 'FlaggedEmail'

    id = db.Column(db.Integer, primary_key=True)
    trn = db.Column(db.String(10), db.ForeignKey('VehicleOwner.trn'), nullable=False)
    incidentID = db.Column(db.Integer, db.ForeignKey('Incident.id'), nullable=False, unique=True)
    datetime = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(30), nullable=False)

    def __init__(self, trn, incidentID, datetimeFlagged, status):
        self.trn = trn
        self.incidentID = incidentID
        self.datetime = datetimeFlagged
        self.status = status
 
    def get_id(self):
        try:
            return unicode(self.id)  # python 2 support
        except NameError:
            return str(self.id)  # python 3 support

    def __repr__(self):
        return '<FlaggedEmail %r %r %r>' % (self.id, self.trn, self.status)

'''JETS API'''
class FlaggedImage(db.Model):
    __tablename__ = 'FlaggedImage'

    id = db.Column(db.Integer, primary_key=True)
    incidentID = db.Column(db.Integer, db.ForeignKey('Incident.id'), nullable=False, unique=True)
    datetime = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(30), nullable=False)

    def __init__(self, incidentID, datetimeFlagged, status):
        self.incidentID = incidentID
        self.datetime = datetimeFlagged
        self.status = status
 
    def get_id(self):
        try:
            return unicode(self.id)  # python 2 support
        except NameError:
            return str(self.id)  # python 3 support

    def __repr__(self):
        return '<FlaggedImage %r %r>' % (self.id, self.status)

'''JETS API'''
class ArchivedTicket(db.Model):
    __tablename__ = 'ArchivedTicket'

    id = db.Column(db.Integer, primary_key=True)
    incidentID = db.Column(db.Integer, db.ForeignKey('Incident.id'), nullable=False, unique=True)
    datetime = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(70), nullable=False)

    def __init__(self, incidentID, datetimeIssued, status):
        self.incidentID = incidentID
        self.datetime = datetimeIssued
        self.status = status
 
    def get_id(self):
        try:
            return unicode(self.id)  # python 2 support
        except NameError:
            return str(self.id)  # python 3 support

    def __repr__(self):
        return '<ArchivedTicket %r %r>' % (self.id, self.status)

'''TAX AUTHORITY API'''        
class Vehicle(db.Model):
    __tablename__ = 'Vehicle'

    licenseplate = db.Column(db.String(20), primary_key=True, autoincrement=False)
    make = db.Column(db.String(60), nullable=False)
    model= db.Column(db.String(60), nullable=False)
    colour = db.Column(db.String(60), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    licensediscno = db.Column(db.String(60), nullable=False)
    cartype = db.Column(db.String(60), nullable=False)
    expdate = db.Column(db.Date, nullable=False)

    def __init__(self, licenseplate, make, model, colour, year, licensediscno, cartype, expdate):
        self.licenseplate = licenseplate
        self.make= make
        self.model= model
        self.colour = colour
        self.year= year
        self.licensediscno= licensediscno
        self.cartype= cartype
        self.expdate= expdate

    def __repr__(self):
        return '<Vehicle %r %r %r>' % (self.make, self.model, self.licenseplate)

'''TAX AUTHORITY API''' 
class VehicleOwner(db.Model):
    __tablename__ = 'VehicleOwner'

    trn = db.Column(db.String(10), primary_key=True, autoincrement=False)
    fname = db.Column(db.String(25), nullable=False)
    lname= db.Column(db.String(25), nullable=False)
    mname= db.Column(db.String(25), nullable=False)
    address= db.Column(db.String(100), nullable=False)
    country= db.Column(db.String(10), nullable=False)
    parish= db.Column(db.String(30), nullable=False)
    email= db.Column(db.String(60), nullable=False)
    dob = db.Column(db.Date, nullable=False)
    gender = db.Column(db.String(8), nullable=False)
    licenseplate = db.Column(db.String(20), db.ForeignKey('Vehicle.licenseplate', ondelete='CASCADE'), nullable=False)
    licensein = db.Column(db.String(10), nullable=False)
    expdate = db.Column(db.Date, nullable=False)
    licenseType = db.Column(db.String(10), nullable=False)

    def __init__(self, trn, fname, mname, lname, address, parish, country, email, dob, gender, licenseplate, licensein, expdate, licenseType):
        self.trn = trn
        self.fname= fname
        self.lname= lname
        self.mname = mname
        self.address = address
        self.country = country
        self.parish = parish
        self.email = email
        self.dob = dob
        self.gender = gender
        self.licenseplate = licenseplate
        self.licensein = licensein
        self.expdate= expdate
        self.licenseType = licenseType

    def __repr__(self):
        return '<Vehicle Owner %r %r>' % (self.fname, self.lname)

'''TAX AUTHORITY API''' 
class Offence(db.Model):
    __tablename__ = 'Offence'

    code = db.Column(db.String(4), primary_key=True)
    description = db.Column(db.String(100), nullable=False)
    fine = db.Column(db.Integer, nullable=False)
    points = db.Column(db.Integer, nullable=False)
    paymentDuration = db.Column(db.Integer, nullable=False) # Time alloted (in days) for paying ticket

    def __init__(self, description, code, fine, points, paymentDuration=60):
        self.description = description
        self.code = code
        self.fine = fine
        self.points = points
        self.paymentDuration = paymentDuration

    def get_id(self):
        try:
            return unicode(self.code)  # python 2 support
        except NameError:
            return str(self.code)  # python 3 support

    def __repr__(self):
        return '<Offence %r %r >' % (self.code, self.description)

'''TRAFFIC CAM API'''
class Location(db.Model):
    __tablename__ = 'Location'

    id = db.Column(db.Integer, primary_key=True)
    description = db.Column(db.String(100), nullable=False)
    parish = db.Column(db.String(20), nullable=False)

    def __init__(self, description, parish):
        self.description = description
        self.parish = parish
 
    def get_id(self):
        try:
            return unicode(self.id)  # python 2 support
        except NameError:
            return str(self.id)  # python 3 support

    def __repr__(self):
        return '<Location %r %r >' % (self.description, self.parish)

class TrafficCam(db.Model):
    __tablename__ = 'TrafficCam'

    id = db.Column(db.Integer, primary_key=True)
    validOffences = db.Column(db.String(20), nullable=False)    # e.g 'E200 E300 E400' represents a speedtrap camera; 'F100' represents a stoplight cam
    locationID = db.Column(db.Integer, db.ForeignKey('Location.id', ondelete='CASCADE'), nullable=False)

    def __init__(self, validOffences, locationID):
        self.validOffences = validOffences
        self.locationID = locationID
 
    def get_id(self):
        try:
            return unicode(self.id)  # python 2 support
        except NameError:
            return str(self.id)  # python 3 support

    def __repr__(self):
        return '<Traffic Camera %r %r >' % (self.validOffences, self.locationID)

class SaltGenerator():
    '''A random string generator'''
    
    @staticmethod
    def symbol():
        chars = [   
                    chr(33),
                    chr(r.randint(35, 38)), 
                    chr(43), 
                    chr(r.randint(45, 46)),
                    chr(61), 
                    chr(r.randint(63, 64)),
                    chr(95),
                ]
        i = r.randint(0, len(chars)-1)
        return chars[i]

    @staticmethod
    def lowercase():
        return chr(r.randint(97, 122))

    @staticmethod
    def uppercase():
        return chr(r.randint(65, 90))

    @staticmethod
    def digit():
        return chr(r.randint(48, 57))

    @staticmethod
    def string(length = 8, sym = True, num = True, upp = True, low = True):
        '''Generates a pseudorandom string with the given properties'''

        newString = ''
        validParams = sym or num or upp or low 
        if not validParams:
            return 'error: at least one option must be enabled'

        while len(newString) < int(length):            
            choice = r.randint(1,9)
            if choice == 1:
                if sym:
                    newString += SaltGenerator.symbol()
            elif choice == 2 or choice == 3 or choice == 4:
                if low:
                    newString += SaltGenerator.lowercase()
            elif choice == 5 or choice == 6 or choice == 7:
                if upp:
                    newString += SaltGenerator.uppercase()
            elif choice == 8 or choice == 9:
                if num:
                    newString += SaltGenerator.digit()
            else:
                break
        return newString
