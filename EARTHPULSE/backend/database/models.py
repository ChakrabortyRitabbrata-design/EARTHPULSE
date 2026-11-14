"""
EARTHPULSE - SQLAlchemy Declarative Models (Future PostGIS Compatible)
"""
from sqlalchemy import Column, Integer, Float, String, Date, Text, ForeignKey
from sqlalchemy.orm import relationship
from backend.database.connection import Base


class GlacierModel(Base):
    __tablename__ = "glaciers"

    id = Column(Integer, primary_key=True, index=True)
    country = Column(String(4), index=True)
    short_name = Column(String(255), index=True)
    names = Column(String(500))
    latitude = Column(Float, index=True)
    longitude = Column(Float, index=True)
    gtng_region = Column(String(50))
    glims_id = Column(String(50), index=True)
    rgi60_ids = Column(String(100))
    parent_glacier_id = Column(Float, nullable=True)
    references = Column(Text, nullable=True)
    remarks = Column(Text, nullable=True)

    # Relationships
    states = relationship("GlacierStateModel", back_populates="glacier")
    front_variations = relationship("FrontVariationModel", back_populates="glacier")
    mass_balances = relationship("MassBalanceModel", back_populates="glacier")
    events = relationship("GlacierEventModel", back_populates="glacier")


class GlacierStateModel(Base):
    __tablename__ = "glacier_states"

    id = Column(Integer, primary_key=True, index=True)
    glacier_id = Column(Integer, ForeignKey("glaciers.id"), index=True)
    date = Column(String(50), index=True)
    highest_elevation = Column(Float, nullable=True)
    lowest_elevation = Column(Float, nullable=True)
    mean_elevation = Column(Float, nullable=True)
    area = Column(Float, nullable=True)  # in m²
    length = Column(Float, nullable=True)  # in m

    glacier = relationship("GlacierModel", back_populates="states")


class FrontVariationModel(Base):
    __tablename__ = "front_variations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    glacier_id = Column(Integer, ForeignKey("glaciers.id"), index=True)
    series_id = Column(Integer, nullable=True)
    begin_date = Column(String(50), nullable=True)
    end_date = Column(String(50), index=True)
    length_change = Column(Float, nullable=True)  # in meters
    length_change_direction = Column(String(20), nullable=True)

    glacier = relationship("GlacierModel", back_populates="front_variations")


class MassBalanceModel(Base):
    __tablename__ = "mass_balances"

    id = Column(Integer, primary_key=True, autoincrement=True)
    glacier_id = Column(Integer, ForeignKey("glaciers.id"), index=True)
    year = Column(Integer, index=True)
    annual_balance = Column(Float, nullable=True)  # in mm w.e.
    winter_balance = Column(Float, nullable=True)
    summer_balance = Column(Float, nullable=True)
    ela = Column(Float, nullable=True)  # in m a.s.l.
    aar = Column(Float, nullable=True)  # in %

    glacier = relationship("GlacierModel", back_populates="mass_balances")


class GlacierEventModel(Base):
    __tablename__ = "glacier_events"

    id = Column(Integer, primary_key=True, index=True)
    glacier_id = Column(Integer, ForeignKey("glaciers.id"), index=True)
    date = Column(String(50), index=True)
    description = Column(Text, nullable=True)
    surge = Column(String(10), nullable=True)
    calving = Column(String(10), nullable=True)
    flood = Column(String(10), nullable=True)
    avalanche = Column(String(10), nullable=True)

    glacier = relationship("GlacierModel", back_populates="events")
