
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



--INSERT INTO ChainsPptoEgrSaldos (Año, FF, Rubro, ProgPPtal, Partida, MomentoEgreso, Saldo)
SELECT p.Año, pd.FF, pd.Rubro, pd.ClasifProgramatLocal, pd.Partida, pd.MomentoEgreso, SUM(Cargo-Abono)*CASE pd.MomentoEgreso WHEN 1 THEN -1 WHEN 3 THEN -1 ELSE 1 END
FROM Polizas p INNER JOIN Polizas_Detalle pd ON p.Id=pd.IdPoliza
WHERE NOT MomentoEgreso IS NULL AND NOT FF IS NULL AND NOT ClasifProgramatLocal IS NULL AND NOT Partida IS NULL AND NOT Rubro IS NULL
GROUP BY p.Año, pd.FF, pd.Rubro, pd.ClasifProgramatLocal, pd.Partida, pd.MomentoEgreso

GO

IF OBJECT_ID('[dbo].[SetMomentoEgreso_Created]', 'TR') IS NOT NULL
    DROP TRIGGER [dbo].[SetMomentoEgreso_Created];

IF OBJECT_ID('[dbo].[SetMomentoEgreso_Modified]', 'TR') IS NOT NULL
    DROP TRIGGER [dbo].[SetMomentoEgreso_Modified];
GO

IF OBJECT_ID('[dbo].[TR_Polizas_Detalle_Master]', 'TR') IS NOT NULL
    DROP TRIGGER [dbo].[TR_Polizas_Detalle_Master];
GO

CREATE TRIGGER [dbo].[TR_Polizas_Detalle_Master]
ON [dbo].[Polizas_Detalle]
AFTER INSERT, UPDATE, DELETE
AS
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
            FROM [dbo].[Polizas_Detalle] pd
            INNER JOIN inserted i ON pd.IdPoliza = i.IdPoliza AND pd.Id = i.Id;
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
            FROM [dbo].[Polizas_Detalle] pd
            INNER JOIN inserted i ON pd.IdPoliza = i.IdPoliza AND pd.Id = i.Id;
        END
    END

    ----------------------------------------------------------------------
    -- PASO B: Calcular Deltas e Incrementar/Decrementar Saldos
    ----------------------------------------------------------------------
    ;WITH ImpactoDeleted AS (
        SELECT 
            p.[Año],
            d.[FF],
            d.[Rubro],
            d.[ClasifProgramatLocal],
            d.[Partida],
            d.[MomentoEgreso],
            -1 * SUM(
                CASE 
                    WHEN d.[MomentoEgreso] = 1 THEN ISNULL(d.[Abono], 0) - ISNULL(d.[Cargo], 0)
                    ELSE ISNULL(d.[Cargo], 0) - ISNULL(d.[Abono], 0)
                END
            ) AS [Delta]
        FROM deleted d
        INNER JOIN [dbo].[Polizas] p ON d.[IdPoliza] = p.[Id]
        WHERE p.[Aplicada] = 1
          AND d.[FF] IS NOT NULL 
          AND d.[ClasifProgramatLocal] IS NOT NULL 
          AND d.[Partida] IS NOT NULL 
          AND d.[MomentoEgreso] IS NOT NULL
        GROUP BY p.[Año], d.[FF], d.[Rubro], d.[ClasifProgramatLocal], d.[Partida], d.[MomentoEgreso]
    ),

    ImpactoInserted AS (
        SELECT 
            p.[Año],
            pd.[FF],
            pd.[Rubro],
            pd.[ClasifProgramatLocal],
            pd.[Partida],
            pd.[MomentoEgreso],
            SUM(
                CASE 
                    WHEN pd.[MomentoEgreso] = 1 THEN ISNULL(pd.[Abono], 0) - ISNULL(pd.[Cargo], 0)
                    ELSE ISNULL(pd.[Cargo], 0) - ISNULL(pd.[Abono], 0)
                END
            ) AS [Delta]
        FROM inserted i
        INNER JOIN [dbo].[Polizas_Detalle] pd ON i.[IdPoliza] = pd.[IdPoliza] AND i.[Id] = pd.[Id]
        INNER JOIN [dbo].[Polizas] p ON pd.[IdPoliza] = p.[Id]
        WHERE p.[Aplicada] = 1
          AND pd.[FF] IS NOT NULL 
          AND pd.[ClasifProgramatLocal] IS NOT NULL 
          AND pd.[Partida] IS NOT NULL 
          AND pd.[MomentoEgreso] IS NOT NULL
        GROUP BY p.[Año], pd.[FF], pd.[Rubro], pd.[ClasifProgramatLocal], pd.[Partida], pd.[MomentoEgreso]
    ),

    DeltasConsolidadas AS (
        SELECT 
            [Año], [FF], [Rubro], [ClasifProgramatLocal], [Partida], [MomentoEgreso],
            SUM([Delta]) AS [DeltaTotal]
        FROM (
            SELECT * FROM ImpactoDeleted
            UNION ALL
            SELECT * FROM ImpactoInserted
        ) AS Cambios
        GROUP BY [Año], [FF], [Rubro], [ClasifProgramatLocal], [Partida], [MomentoEgreso]
    )

    MERGE [dbo].[ChainsPptoEgrSaldos] AS Target
    USING DeltasConsolidadas AS Source
    ON (
        ISNULL(Target.[Año], 0) = ISNULL(Source.[Año], 0)
        AND ISNULL(Target.[FF], '') = ISNULL(Source.[FF], '')
        AND ISNULL(Target.[Rubro], 0) = ISNULL(Source.[Rubro], 0)
        AND ISNULL(Target.[ProgPPtal], '') = ISNULL(Source.[ClasifProgramatLocal], '')
        AND ISNULL(Target.[Partida], 0) = ISNULL(Source.[Partida], 0)
        AND ISNULL(Target.[MomentoEgreso], 0) = ISNULL(Source.[MomentoEgreso], 0)
    )
    WHEN MATCHED THEN
        UPDATE SET Target.[Saldo] = ISNULL(Target.[Saldo], 0) + Source.[DeltaTotal]
    WHEN NOT MATCHED BY TARGET THEN
        INSERT ([Año], [FF], [Rubro], [ProgPPtal], [Partida], [MomentoEgreso], [Saldo])
        VALUES (Source.[Año], Source.[FF], Source.[Rubro], Source.[ClasifProgramatLocal], Source.[Partida], Source.[MomentoEgreso], Source.[DeltaTotal]);
END;
GO


DECLARE @Año SMALLINT;
SET @Año=2026;
SELECT  p.FF, ff.Descripcion, ISNULL([1],0) Autorizado, ISNULL([1],0)+ISNULL([3],0) Modificado, ISNULL([2],0) Disponible,
    ISNULL([5],0) Reservado, ISNULL([4],0) Comprometido, ISNULL([6],0) Devengado, ISNULL([8],0) Pagado
FROM (
    SELECT  FF, MomentoEgreso, Saldo
    FROM ChainsPptoEgrSaldos
    WHERE Año=@Año
) d
PIVOT (
    SUM(Saldo)
    FOR MomentoEgreso IN ([1], [2], [3], [4], [5], [6], [7], [8])
) p INNER JOIN Fuentes_Financiamiento ff ON ff.Año=@Año AND ff.Codigo=p.FF AND ff.AñoConsolidada=@Año;
GO


ALTER PROCEDURE Dash_EdoPpto_COG (@Año SMALLINT, @FF VARCHAR(5), @OnlyConsolid BIT, @byCapConcPart TINYINT) AS
BEGIN
    SELECT Partida, part.Descripcion, ISNULL([1],0) Autorizado, ISNULL([1],0)+ISNULL([3],0) Modificado, ISNULL([2],0) Disponible,
        ISNULL([5],0) Reservado, ISNULL([4],0) Comprometido, ISNULL([6],0) Devengado, ISNULL([8],0) Pagado
    FROM (
        SELECT CASE @byCapConcPart WHEN 0 THEN c.Partida/1000*1000 WHEN 1 THEN c.Partida/100*100 ELSE c.Partida END Partida, MomentoEgreso, Saldo
        FROM ChainsPptoEgrSaldos c INNER JOIN Fuentes_Financiamiento ff ON ff.Año=c.Año AND ff.Codigo=c.FF
        WHERE c.Año=@Año AND (FF=@FF OR @FF='ALL') AND ff.Consolidable=@OnlyConsolid AND ff.Año=ff.AñoConsolidada
    ) d
    PIVOT (
        SUM(Saldo)
        FOR MomentoEgreso IN ([1], [2], [3], [4], [5], [6], [7], [8])
    ) p INNER JOIN Partidas part ON part.Año=@Año AND part.Clave=p.Partida 
END;
GO


 


Autorizado 1
Modificado 1+3
Disponible 2
Reservado 5
Comprometido 4
Devengado 6
Pagado 7


