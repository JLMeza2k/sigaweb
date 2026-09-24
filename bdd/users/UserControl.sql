USE [SIGA]
GO

CREATE TABLE WebUsers (
	IdUser smallint IDENTITY(1,1) NOT NULL,
	RFC varchar(13) NOT NULL,
	Profile tinyint NOT NULL,
	Password varchar(1000) NOT NULL,
	eMail varchar(100) NOT NULL,
	sideBarOpcs smallint NULL,
	CodePassRecover varchar(200) NULL,
	ActivationCode varchar(200) NULL,
	Activo bit NOT NULL,
 CONSTRAINT [PK_Viaticos_WebUsers] PRIMARY KEY CLUSTERED ( 	[RFC] ASC )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO

ALTER TABLE WebUsers ADD  CONSTRAINT DF_WebUsers_sideBarOpcs  DEFAULT ((0)) FOR sideBarOpcs
GO

