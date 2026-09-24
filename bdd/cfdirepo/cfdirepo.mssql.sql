IF DB_ID('cfdirepo') IS NULL CREATE DATABASE cfdirepo;
GO
USE cfdirepo;
GO

IF OBJECT_ID('cfdi_recibidos_retenciones','U') IS NOT NULL DROP TABLE cfdi_recibidos_retenciones;
IF OBJECT_ID('cfdi_recibidos_pagos','U') IS NOT NULL DROP TABLE cfdi_recibidos_pagos;
IF OBJECT_ID('cfdi_recibidos_raw','U') IS NOT NULL DROP TABLE cfdi_recibidos_raw;
IF OBJECT_ID('cfdi_recibidos','U') IS NOT NULL DROP TABLE cfdi_recibidos;
IF OBJECT_ID('cfdi_emitidos_retenciones','U') IS NOT NULL DROP TABLE cfdi_emitidos_retenciones;
IF OBJECT_ID('cfdi_emitidos_pagos','U') IS NOT NULL DROP TABLE cfdi_emitidos_pagos;
IF OBJECT_ID('cfdi_emitidos_raw','U') IS NOT NULL DROP TABLE cfdi_emitidos_raw;
IF OBJECT_ID('cfdi_emitidos_nomina','U') IS NOT NULL DROP TABLE cfdi_emitidos_nomina;
IF OBJECT_ID('cfdi_emitidos','U') IS NOT NULL DROP TABLE cfdi_emitidos;
IF OBJECT_ID('cfdi_sat_solicitudes','U') IS NOT NULL DROP TABLE cfdi_sat_solicitudes;
GO

CREATE TABLE cfdi_recibidos (
	UUID UNIQUEIDENTIFIER PRIMARY KEY,
    cfdiVersion VARCHAR(5),
    tipoComprobante CHAR(1),
    serie VARCHAR(20),
    folio VARCHAR(30),
    fecha SMALLDATETIME,
    metodoPago VARCHAR(3),
    formaPago VARCHAR(2),
    rfcEmisor VARCHAR(13),
    nombreEmisor VARCHAR(100),
    regimenFiscalEmisor VARCHAR(3),
    codigoPostalEmisor VARCHAR(5),
    importe MONEY,
    total MONEY,
    cancelado BIT,
    fechaCancelacion SMALLDATETIME,
    created_at SMALLDATETIME DEFAULT GETDATE()
);

CREATE TABLE cfdi_recibidos_retenciones (
	UUID UNIQUEIDENTIFIER,
    id TINYINT,
    impuesto TINYINT,
    importe MONEY,
    created_at SMALLDATETIME DEFAULT GETDATE(),
	PRIMARY KEY (UUID, id),
    CONSTRAINT FK_CFDI_RECIBIDO_RET FOREIGN KEY (UUID) REFERENCES cfdi_recibidos(UUID)
);

CREATE TABLE cfdi_recibidos_raw (
	UUID UNIQUEIDENTIFIER PRIMARY KEY,
    xmlRawData VARBINARY(MAX),
    created_at SMALLDATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_CFDI_RECIBIDO_RAW FOREIGN KEY (UUID) REFERENCES cfdi_recibidos(UUID)
);

CREATE TABLE cfdi_recibidos_pagos (
	UUID UNIQUEIDENTIFIER,
    id SMALLINT,
    doctoRelacionado UNIQUEIDENTIFIER,
    fechaPago SMALLDATETIME,
    formaPago VARCHAR(2),
    montoPago MONEY,
    created_at SMALLDATETIME DEFAULT GETDATE(),
    PRIMARY KEY (UUID, id),
    CONSTRAINT FK_CFDI_RECIBIDO_PAGOS FOREIGN KEY (UUID) REFERENCES cfdi_recibidos(UUID)
);    

CREATE TABLE cfdi_emitidos (
	UUID UNIQUEIDENTIFIER PRIMARY KEY,
    cfdiVersion VARCHAR(5),
    tipoComprobante CHAR(1),
    serie VARCHAR(20),
    folio VARCHAR(30),
    fecha SMALLDATETIME,
    metodoPago VARCHAR(3),
    formaPago VARCHAR(2),
    rfcReceptor VARCHAR(13),
    nombreReceptor VARCHAR(100),
    codigoPostalReceptor VARCHAR(5),
    regimenFiscalReceptor VARCHAR(3),
    importe MONEY,
    total MONEY,
    cancelado BIT,
    fechaCancelacion SMALLDATETIME,
    created_at SMALLDATETIME DEFAULT GETDATE()
);

CREATE TABLE cfdi_emitidos_raw (
	UUID UNIQUEIDENTIFIER PRIMARY KEY,
    xmlRawData VARBINARY(MAX),
    created_at SMALLDATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_CFDI_EMITIDO_RAW FOREIGN KEY (UUID) REFERENCES cfdi_emitidos(UUID)
);

CREATE TABLE cfdi_emitidos_pagos (
	UUID UNIQUEIDENTIFIER,
    id SMALLINT,
    doctoRelacionado UNIQUEIDENTIFIER,
    fechaPago SMALLDATETIME,
    formaPago VARCHAR(2),
    montoPago MONEY,
    numCuenta VARCHAR(18),
    created_at SMALLDATETIME DEFAULT GETDATE(),
    PRIMARY KEY (UUID, id),
    CONSTRAINT FK_CFDI_EMITIDO_PAGOS FOREIGN KEY (UUID) REFERENCES cfdi_emitidos(UUID)
);    

CREATE TABLE cfdi_emitidos_retenciones (
	UUID UNIQUEIDENTIFIER,
    id TINYINT,
    impuesto TINYINT,
    importe MONEY,
    created_at SMALLDATETIME DEFAULT GETDATE(),
	PRIMARY KEY (UUID, id),    
    CONSTRAINT FK_CFDI_EMITIDO_RET FOREIGN KEY (UUID) REFERENCES cfdi_emitidos(UUID)
);

CREATE TABLE cfdi_emitidos_nomina (
	UUID UNIQUEIDENTIFIER PRIMARY KEY,
    curp VARCHAR(18),
    fechaPago SMALLDATETIME,
    fechaInicial SMALLDATETIME,
    fechaFinal SMALLDATETIME,
    percepciones MONEY,
    deducciones MONEY,
    isrRetenido MONEY,
    created_at SMALLDATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_CFDI_EMITIDO_NOMINA FOREIGN KEY (UUID) REFERENCES cfdi_emitidos(UUID)
);    

CREATE TABLE cfdi_sat_solicitudes (
	id INT NOT NULL PRIMARY KEY IDENTITY(1,1),
	del SMALLDATETIME NULL,
	al SMALLDATETIME NULL,
	rfc VARCHAR(13),
	status VARCHAR(20),
	idSolicitud VARCHAR(50),
	idPaquete VARCHAR(50),
	metadata BIT,
	emitidos BIT,
	addToRepo BIT NULL,
	created_at SMALLDATETIME DEFAULT GETDATE()
);
GO


CREATE INDEX ix_emit_fecha ON cfdi_emitidos (fecha)
CREATE INDEX ix_emit_receptor ON cfdi_emitidos (rfcReceptor)
CREATE INDEX ix_emit_tipo ON cfdi_emitidos (tipoComprobante)


CREATE INDEX ix_recib_fecha ON cfdi_recibidos (fecha)
CREATE INDEX ix_recib_emisor ON cfdi_recibidos (rfcEmisor)
CREATE INDEX ix_recib_tipo ON cfdi_recibidos (tipoComprobante)

