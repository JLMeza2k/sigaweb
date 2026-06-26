ALTER VIEW vwRelViaticos AS
SELECT v.Numero, v.Año, v.OfComision, v.Filiacion RFC, v.Nombre, v.Comisionado_a, v.Periodo_del, v.Motivo, v.FFinanc FF, ISNULL(Dias01,0)+ISNULL(Dias02,0)+ISNULL(Dias03,0) Dias,
	ISNULL(v.CuotaDiaria01*Dias01,0)+ISNULL(v.CuotaDiaria02*Dias02,0)+ISNULL(v.CuotaDiaria03*Dias03,0) Viaticos, ISNULL(v.Pasajes,0) Pasajes,
	v.Director, v.FromUA, v.FromCentro, v.Unidad, v.Centro, v.Area, v.Programa, cl.CLC, cl.AñoCLC, cl.Banco, cl.NumCuenta, cl.TipoPago, cl.FolioPago, cl.FechaPago, v.PresentoInforme Comprobado
FROM Viaticos  v LEFT JOIN (
		SELECT DISTINCT cl.Numero CLC, cl.Año AñoCLC, cld.NumeroRef, cld.AñoRef, clp.Tipo TipoPago, clp.Folio FolioPago, clp.Fecha FechaPago, b.Descripcion Banco, cb.NumCuenta
		FROM CLC cl INNER JOIN CLC_Detalle cld ON cl.Numero=cld.Numero AND cl.Año=cld.Año
			LEFT JOIN CLC_Pago clp ON clp.Numero=cl.Numero AND clp.Año=cl.Año AND clp.Aplicado=1 AND clp.Cancelado=0
			LEFT JOIN CtlCtasBancarias cb ON cb.id=clp.IdCtaBancaria
			LEFT JOIN catBancos b ON b.Codigo=cb.IdBanco
		WHERE TipoRef=3
	) cl ON cl.NumeroRef=v.Numero AND cl.AñoRef=v.Año
WHERE v.AutorizPptal=1 



ALTER PROCEDURE [dbo].[webRelViaticos] @Año SMALLINT, @RFC VARCHAR(13), @FF VARCHAR(5), @Director VARCHAR(13), @FromUA TINYINT, @FromCentro TINYINT, @FromFecha SMALLDATETIME, @ToFecha SMALLDATETIME, @OnlyPend BIT AS
BEGIN
	SET NOCOUNT ON
	
	SELECT Numero, Año, OfComision, Nombre, Comisionado_a, Periodo_Del, Motivo, FF, Dias, Viaticos, Pasajes, FechaPago, Comprobado
	FROM vwRelViaticos 
	WHERE Año=@Año AND (RFC=@RFC OR @RFC='') AND (FF=@FF OR @FF='') AND (Director=@Director OR @Director='') AND FromUA=@FromUA AND FromCentro=@FromCentro 
		AND Periodo_del BETWEEN @FromFecha AND @ToFecha --AND ISNULL(FolioPago,-1)=CASE @OnlyPend WHEN 1 THEN -1 ELSE ISNULL(FolioPago,-1) END
		AND Comprobado=CASE @OnlyPend WHEN 1 THEN 0 ELSE Comprobado END
END


