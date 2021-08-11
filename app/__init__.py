from flask import Flask
from flask_login import LoginManager
from flask_sqlalchemy import SQLAlchemy
from flask_wtf.csrf import CSRFProtect
from flask_mail import Mail
from .config import Config

app = Flask(__name__)
csrf = CSRFProtect(app) # global CSRF protection
app.config.from_object(Config)
db = SQLAlchemy(app)
mail = Mail(app)

# Flask-Login login manager
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

from app import views
