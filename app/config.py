import os

class Config(object):
    """Base Config Object"""
    DEBUG = False
    SECRET_KEY = os.environ.get('SECRET_KEY') or "S3CR3TK#Y"
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'mysql://root:@localhost/jamaicaeye'
    SQLALCHEMY_TRACK_MODIFICATIONS = False # This is just here to suppress a warning from SQLAlchemy as it will soon be removed
    UPLOADS_FOLDER = './uploads'
    ISSUED_FOLDER = './uploads/issued'
    FLAGGED_FOLDER = './uploads/flagged'
    ARCHIVES_FOLDER = './uploads/archives'

    MAIL_SERVER = os.environ.get('MAIL_SERVER') or 'smtp.mailtrap.io'
    MAIL_PORT = os.environ.get('MAIL_PORT') or '25'
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')

class DevelopmentConfig(Config):
    """Development Config that extends the Base Config Object"""
    DEVELOPMENT = True
    DEBUG = True

class ProductionConfig(Config):
    """Production Config that extends the Base Config Object"""
    DEBUG = False
