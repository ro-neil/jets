from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, TextAreaField, SelectField, DecimalField, BooleanField, HiddenField
from wtforms.validators import InputRequired, DataRequired
from flask_wtf.file import FileField, FileAllowed, FileRequired


class LoginForm(FlaskForm):
    username = StringField('Username', validators=[InputRequired()])
    password = PasswordField('Password', validators=[InputRequired()])

class ChangePasswordForm(FlaskForm):
    userID = HiddenField('User ID', validators=[InputRequired()])
    oldPassword = PasswordField('Old Password', validators=[InputRequired()])
    newPassword = PasswordField('New Password', validators=[InputRequired()])

class RegistrationForm(FlaskForm):
    username = StringField('Username', validators=[InputRequired()])
    password = PasswordField('Password', validators=[InputRequired()])
    isAdmin = BooleanField('Admin Account')

class IssueTicketForm(FlaskForm):
    date = StringField('Date', validators=[InputRequired()])
    time = StringField('Time', validators=[InputRequired()])
    location = StringField('Location', validators=[InputRequired()])
    parish = StringField('Parish', validators=[InputRequired()])
    offence = StringField('Offence', validators=[InputRequired()])
    snapshot = FileField('Snapshot',
        validators=[FileRequired(), FileAllowed(['jpg', 'jpeg', 'png'], '.jpg, .jpeg and .png Images only!')]
    )

    
