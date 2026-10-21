
CREATE TABLE Bienes_Muebles_SinReg (
	Folio int IDENTITY(1,1) NOT NULL,
	Fecha smalldatetime NOT NULL,
	Unidad tinyint NOT NULL,
	Centro tinyint NOT NULL,
	Area varchar(3) NOT NULL,
	Observaciones varchar(255) NULL,
 CONSTRAINT [PK_Bienes_Muebles_SinReg] PRIMARY KEY CLUSTERED ([Folio] ASC )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO

CREATE TABLE Bienes_Muebles_SinReg_Detalle (
	Folio int NOT NULL,
	id smallint NOT NULL,
	Descripcion varchar(255) NOT NULL,
	Marca varchar(50) NULL,
	Modelo varchar(50) NULL,
	Serie varchar(50) NULL,
	EdoFisico tinyint NOT NULL,
	RFCResponsable varchar(13) NOT NULL,
 CONSTRAINT [PK_Bienes_Muebles_SinReg_Detalle] PRIMARY KEY CLUSTERED (Folio ASC, id ASC) WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO


CREATE TABLE Bienes_Muebles_Verificacion (
	NUIBM int NOT NULL,
	Id smallint NOT NULL,
	Fecha smalldatetime NOT NULL,
	VerifiedBy smallint NULL,
	FoundUA tinyint NULL,
	FoundCt tinyint NULL,
	FoundArea varchar(3) NULL,
	IdRequiredAction tinyint NULL,
	Observaciones varchar](255) NULL,
	Resolved bit NULL,
	ResolvedBy smallint NULL,
	ResolvedAt smalldatetime NULL,
 CONSTRAINT PK_Bienes_Muebles_Verificacion PRIMARY KEY CLUSTERED
	(NUIBM ASC, Id ASC) WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON PRIMARY
) ON PRIMARY
GO