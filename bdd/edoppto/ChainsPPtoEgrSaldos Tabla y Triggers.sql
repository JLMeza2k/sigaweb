CREATE TABLE [dbo].[Polizas](
	[Id] [uniqueidentifier] NOT NULL,
	[Transaccion] [int] NULL,
	[Numero] [int] NOT NULL,
	[Año] [smallint] NOT NULL,
	[TipoPoliza] [tinyint] NOT NULL,
	[CtaBancaria] [smallint] NULL,
	[Unidad] [tinyint] NULL,
	[Centro] [tinyint] NULL,
	[Fecha] [smalldatetime] NULL,
	[Beneficiario] [varchar](128) NULL,
	[Observaciones] [varchar](1024) NULL,
	[Bloqueada] [bit] NULL,
	[Aplicada] [bit] NULL,
	[Cancelada] [bit] NULL,
	[Automatica] [bit] NULL,
	[CreatedBy] [varchar](10) NULL,
	[CreatedAt] [smalldatetime] NULL,
	[ModifiedBy] [varchar](10) NULL,
	[ModifiedAt] [smalldatetime] NULL,
	[NumTransfer] [int] NULL,
	[FechaEntrega] [smalldatetime] NULL,
 CONSTRAINT [PK_Polizas] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO

CREATE TABLE [dbo].[Polizas_Detalle](
	[IdPoliza] [uniqueidentifier] NOT NULL,
	[Id] [smallint] NOT NULL,
	[CRI] [varchar](2) NULL,
	[TipoIngreso] [varchar](3) NULL,
	[ClasifProgramatLocal] [varchar](5) NULL,
	[FF] [varchar](5) NULL,
	[Rubro] [tinyint] NULL,
	[CtaContab] [varchar](5) NULL,
	[SCuenta] [varchar](13) NULL,
	[Descripcion] [varchar](256) NULL,
	[Cargo] [money] NULL,
	[Abono] [money] NULL,
	[CreatedBy] [varchar](10) NULL,
	[CreatedAt] [smalldatetime] NULL,
	[ModifiedBy] [varchar](10) NULL,
	[ModifiedAt] [smalldatetime] NULL,
	[MomentoEgreso] [tinyint] NULL,
	[Partida] [smallint] NULL,
	[OldSCta] [varchar](13) NULL,
	[ClasifAdmva] [int] NULL,
 CONSTRAINT [PK_Polizas_Detalle] PRIMARY KEY NONCLUSTERED 
(
	[IdPoliza] ASC,
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO


CREATE TABLE [dbo].[ChainsPptoEgrSaldos](
	[Año] [smallint] NOT NULL,
	[FF] [varchar](5) NOT NULL,
	[Rubro] [tinyint] NOT NULL,
	[ProgPPtal] [varchar](5) NOT NULL,
	[Partida] [smallint] NOT NULL,
	[MomentoEgreso] [tinyint] NOT NULL,
	[Saldo] [money] NULL,
 CONSTRAINT [PK_ChainsPptoEgrSaldos] PRIMARY KEY CLUSTERED 
(	[Año] ASC, 
	[FF] ASC,
	[Rubro] ASC,
	[ProgPPtal] ASC,
	[Partida] ASC,
	[MomentoEgreso] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO


DELETE FROM ChainsPptoEgrSaldos;

INSERT INTO ChainsPptoEgrSaldos (Año, FF, Rubro, ProgPPtal, Partida, MomentoEgreso, Saldo)
    SELECT p.Año, pd.FF, pd.Rubro, pd.ClasifProgramatLocal, pd.Partida, pd.MomentoEgreso, SUM(Cargo-Abono)*CASE pd.MomentoEgreso WHEN 1 THEN -1 WHEN 3 THEN -1 ELSE 1 END
    FROM Polizas p INNER JOIN Polizas_Detalle pd ON p.Id=pd.IdPoliza
    WHERE p.Aplicada=1 AND NOT MomentoEgreso IS NULL AND NOT FF IS NULL AND NOT ClasifProgramatLocal IS NULL AND NOT Partida IS NULL AND NOT Rubro IS NULL
    GROUP BY p.Año, pd.FF, pd.Rubro, pd.ClasifProgramatLocal, pd.Partida, pd.MomentoEgreso

GO


ALTER TRIGGER [dbo].[TR_Polizas_Detalle_Master] ON [dbo].[Polizas_Detalle]
AFTER INSERT, UPDATE, DELETE AS
BEGIN
    SET NOCOUNT ON;
    ----------------------------------------------------------------------
    -- PASO A: Asignar MomentoEgreso, Partida, CreatedAt y ModifiedAt
    ----------------------------------------------------------------------
    IF EXISTS (SELECT 1 FROM inserted)
    BEGIN
        -- Detectar si es una inserción pura (no existe en deleted)
        IF NOT EXISTS (SELECT 1 FROM deleted)
        BEGIN
            UPDATE pd
            SET MomentoEgreso = CASE i.CtaContab 
                                    WHEN '82100' THEN 1 WHEN '82200' THEN 2 
                                    WHEN '82300' THEN 3 WHEN '82400' THEN 4 
                                    WHEN '82410' THEN 5 WHEN '82500' THEN 6 
                                    WHEN '82600' THEN 7 WHEN '82700' THEN 8 
                                    ELSE NULL 
                                END,
                Partida = CASE LEFT(i.CtaContab, 2) WHEN '82' THEN CAST(RIGHT(i.SCuenta, 4) AS SMALLINT) ELSE NULL END,
                CreatedAt = GETDATE()
            FROM [dbo].[Polizas_Detalle] pd INNER JOIN inserted i ON pd.IdPoliza = i.IdPoliza AND pd.Id = i.Id;
        END
        ELSE
        -- Es una actualización
        BEGIN
            UPDATE pd
            SET MomentoEgreso = CASE i.CtaContab 
                                    WHEN '82100' THEN 1 WHEN '82200' THEN 2 
                                    WHEN '82300' THEN 3 WHEN '82400' THEN 4 
                                    WHEN '82410' THEN 5 WHEN '82500' THEN 6 
                                    WHEN '82600' THEN 7 WHEN '82700' THEN 8 
                                    ELSE NULL 
                                END,
                Partida = CASE LEFT(i.CtaContab, 2) WHEN '82' THEN CAST(RIGHT(i.SCuenta, 4) AS SMALLINT) ELSE NULL END,
                ModifiedAt = GETDATE()
            FROM [dbo].[Polizas_Detalle] pd INNER JOIN inserted i ON pd.IdPoliza = i.IdPoliza AND pd.Id = i.Id;
        END
    END

    ----------------------------------------------------------------------
    -- PASO B: Calcular Deltas e Incrementar/Decrementar Saldos
    ----------------------------------------------------------------------
    ;WITH ImpactoDeleted AS (
        SELECT p.Año, d.FF, d.Rubro, d.ClasifProgramatLocal, d.Partida, d.MomentoEgreso,
            -1 * SUM(
                CASE 
                    WHEN d.MomentoEgreso=1 OR d.MomentoEgreso=3 THEN ISNULL(d.Abono, 0)-ISNULL(d.Cargo, 0)
                    ELSE ISNULL(d.Cargo, 0) - ISNULL(d.Abono, 0)
                END
            ) AS Delta
        FROM deleted d INNER JOIN Polizas p ON d.IdPoliza = p.Id
        WHERE p.Aplicada=1 AND NOT d.FF IS NULL AND NOT d.ClasifProgramatLocal IS NULL AND NOT d.Partida IS NULL AND NOT d.MomentoEgreso IS NULL
        GROUP BY p.Año, d.FF, d.Rubro, d.ClasifProgramatLocal, d.Partida, d.MomentoEgreso
    ),

    ImpactoInserted AS (
        SELECT p.Año, pd.FF, pd.Rubro, pd.ClasifProgramatLocal, pd.Partida, pd.MomentoEgreso,
            SUM(
                CASE 
                    WHEN pd.MomentoEgreso=1 OR pd.MomentoEgreso=3 THEN ISNULL(pd.Abono, 0)-ISNULL(pd.Cargo, 0)
                    ELSE ISNULL(pd.Cargo, 0) - ISNULL(pd.Abono, 0)
                END
            ) AS Delta
        FROM inserted i INNER JOIN Polizas_Detalle pd ON i.IdPoliza=pd.IdPoliza AND i.Id=pd.Id
            INNER JOIN Polizas p ON pd.IdPoliza=p.Id
        WHERE p.Aplicada=1 AND NOT pd.FF IS NULL AND NOT pd.ClasifProgramatLocal IS NULL AND NOT pd.Partida IS NULL AND NOT pd.MomentoEgreso IS NULL
        GROUP BY p.Año, pd.FF, pd.Rubro, pd.ClasifProgramatLocal, pd.Partida, pd.MomentoEgreso
    ),

    DeltasConsolidadas AS (
        SELECT Año, FF, Rubro, ClasifProgramatLocal, Partida, MomentoEgreso, SUM(Delta) AS DeltaTotal
        FROM (SELECT * FROM ImpactoDeleted UNION ALL SELECT * FROM ImpactoInserted) AS Cambios
        GROUP BY Año, FF, Rubro, ClasifProgramatLocal, Partida, MomentoEgreso
    )

    MERGE ChainsPptoEgrSaldos t USING DeltasConsolidadas s ON (
        t.Año=s.Año AND t.FF=s.FF AND t.Rubro=s.Rubro AND t.ProgPPtal=s.ClasifProgramatLocal AND t.Partida=s.Partida AND t.MomentoEgreso=s.MomentoEgreso
    )
    WHEN MATCHED THEN UPDATE SET t.Saldo=t.Saldo+s.DeltaTotal
    WHEN NOT MATCHED BY TARGET THEN
        INSERT (Año, FF, Rubro, ProgPPtal, Partida, MomentoEgreso, Saldo)
        VALUES (s.Año, s.FF, s.Rubro, s.ClasifProgramatLocal, s.Partida, s.MomentoEgreso, s.DeltaTotal);
END;
GO;


-- Trigger en polizas para actualizar ChainsPptoEgrSaldos
CREATE TRIGGER dbo.TR_Polizas_ChainsPptoEgrSaldos ON dbo.Polizas
AFTER UPDATE, DELETE AS
BEGIN
    SET NOCOUNT ON;

    ;WITH Cambios AS (
        -- Revertir la contribución anterior
        SELECT p.Año, pd.FF, pd.Rubro,pd.ClasifProgramatLocal, pd.Partida, pd.MomentoEgreso,
            -SUM(CASE WHEN pd.MomentoEgreso IN (1, 3) THEN ISNULL(pd.Abono, 0) - ISNULL(pd.Cargo, 0)
                ELSE ISNULL(pd.Cargo, 0) - ISNULL(pd.Abono, 0)
            END) Delta
        FROM deleted AS p INNER JOIN dbo.Polizas_Detalle AS pd ON pd.IdPoliza = p.Id
        WHERE p.Aplicada=1 AND pd.FF IS NOT NULL AND pd.Rubro IS NOT NULL AND pd.ClasifProgramatLocal IS NOT NULL AND pd.Partida IS NOT NULL AND pd.MomentoEgreso IS NOT NULL
        GROUP BY p.Año, pd.FF, pd.Rubro, pd.ClasifProgramatLocal, pd.Partida, pd.MomentoEgreso
        UNION ALL
        -- Aplicar la nueva contribución
        SELECT p.Año, pd.FF, pd.Rubro, pd.ClasifProgramatLocal, pd.Partida, pd.MomentoEgreso, 
            SUM(CASE WHEN pd.MomentoEgreso IN (1, 3) THEN ISNULL(pd.Abono, 0) - ISNULL(pd.Cargo, 0)
                ELSE ISNULL(pd.Cargo, 0) - ISNULL(pd.Abono, 0)
            END) Delta
        FROM inserted AS p INNER JOIN dbo.Polizas_Detalle AS pd ON pd.IdPoliza = p.Id 
        WHERE p.Aplicada=1 AND pd.FF IS NOT NULL AND pd.Rubro IS NOT NULL AND pd.ClasifProgramatLocal IS NOT NULL AND pd.Partida IS NOT NULL AND pd.MomentoEgreso IS NOT NULL
        GROUP BY p.Año, pd.FF, pd.Rubro, pd.ClasifProgramatLocal, pd.Partida, pd.MomentoEgreso
    ), 
    Deltas AS (
        SELECT Año, FF, Rubro, ClasifProgramatLocal, Partida, MomentoEgreso, SUM(Delta) Delta
        FROM Cambios 
        GROUP BY Año, FF, Rubro, ClasifProgramatLocal,Partida, MomentoEgreso
        HAVING SUM(Delta) <> 0
    )
    MERGE dbo.ChainsPptoEgrSaldos WITH (HOLDLOCK) AS t
    USING Deltas s ON t.Año=s.Año AND t.FF=s.FF AND t.Rubro=s.Rubro AND t.ProgPPtal=s.ClasifProgramatLocal AND t.Partida=s.Partida AND t.MomentoEgreso=s.MomentoEgreso
    WHEN MATCHED THEN UPDATE SET t.Saldo = ISNULL(t.Saldo, 0) + s.Delta
    WHEN NOT MATCHED BY TARGET THEN
        INSERT (Año, FF, Rubro, ProgPPtal, Partida, MomentoEgreso, Saldo)
        VALUES (s.Año, s.FF, s.Rubro, s.ClasifProgramatLocal,s.Partida, s.MomentoEgreso, s.Delta);
END;

