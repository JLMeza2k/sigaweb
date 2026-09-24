
IF OBJECT_ID('sp_importar_cfdi_v40', 'P') IS NOT NULL DROP PROCEDURE sp_importar_cfdi_v40;
GO
CREATE PROCEDURE sp_importar_cfdi_v40 @p_xml_raw varbinary(max), @p_mi_rfc  varchar(13) AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT OFF;

    DECLARE @x                      xml;
    DECLARE @v_uuid_str            uniqueidentifier;
    DECLARE @v_uuid_raw            varchar(36);
    DECLARE @v_tipo_comprobante   char(1);
    DECLARE @v_tipo_raw            varchar(20);
    DECLARE @v_serie               varchar(20);
    DECLARE @v_folio               varchar(30);
    DECLARE @v_fecha_str           varchar(25);
    DECLARE @v_fecha               smalldatetime;
    DECLARE @v_metodo_pago         varchar(3);
    DECLARE @v_forma_pago          varchar(2);
    DECLARE @v_rfc_emisor          varchar(13);
    DECLARE @v_nombre_emisor       varchar(100);
    DECLARE @v_regimen_emisor      varchar(3);
    DECLARE @v_cp_emisor           varchar(5);
    DECLARE @v_rfc_receptor        varchar(13);
    DECLARE @v_nombre_receptor     varchar(100);
    DECLARE @v_cp_receptor         varchar(5);
    DECLARE @v_regimen_receptor    varchar(3);
    DECLARE @v_importe             money;
    DECLARE @v_total               money;
    DECLARE @v_cfdi_version        varchar(5);

    /* Tablas de trabajo para los nodos hijos */
    DECLARE @retenciones TABLE (id tinyint, impuesto tinyint, importe MONEY);
    DECLARE @pagos TABLE (
        id smallint,
        doctoRelacionado uniqueidentifier,
        fechaPago smalldatetime,
        formaPago varchar(2),
        montoPago MONEY,
        numCuenta varchar(18)
    );

    /* Variables de nómina */
    DECLARE @n_curp varchar(18), @n_fechaPago smalldatetime, @n_fechaInicial smalldatetime, @n_fechaFinal smalldatetime;
    DECLARE @n_percepciones MONEY, @n_deducciones MONEY, @n_isr MONEY;

    BEGIN TRY
        /* 1. El XML entra como VARBINARY(MAX) con bytes UTF-8 crudos.
               El parser de xml respeta encoding="UTF-8" y decodifica bien. */
        SET @x = CAST(@p_xml_raw AS xml);

        /* 2. EXTRAER EL UUID (TimbreFiscalDigital, mismo namespace en 3.2/3.3/4.0).
               Ruta específica (no '//') para evitar el escaneo completo del árbol. */
        WITH XMLNAMESPACES ('http://www.sat.gob.mx/TimbreFiscalDigital' AS tfd)
        SELECT @v_uuid_raw = @x.value('(/*[local-name()="Comprobante"]/*[local-name()="Complemento"]/tfd:TimbreFiscalDigital/@UUID)[1]', 'varchar(36)'),
               @v_uuid_str = TRY_CONVERT(uniqueidentifier, @v_uuid_raw);

        IF @v_uuid_str IS NULL
            THROW 50000, 'UUID inválido o no encontrado en el CFDI.', 1;

        /* 3. EXTRAER DATOS GENERALES
               Se usan consultas sin namespace (local-name()) y COALESCE para cubrir
               tanto la capitalización PascalCase de 3.3/4.0 como la minúscula de 3.2. */
        SELECT
            @v_tipo_raw         = COALESCE(@x.value('(/*[local-name()="Comprobante"]/@TipoDeComprobante)[1]', 'varchar(20)'),
                                          @x.value('(/*[local-name()="Comprobante"]/@tipoDeComprobante)[1]', 'varchar(20)')),
            @v_cfdi_version     = COALESCE(@x.value('(/*[local-name()="Comprobante"]/@Version)[1]', 'varchar(5)'),
                                          @x.value('(/*[local-name()="Comprobante"]/@version)[1]', 'varchar(5)')),
            @v_serie            = COALESCE(@x.value('(/*[local-name()="Comprobante"]/@Serie)[1]', 'varchar(20)'),
                                          @x.value('(/*[local-name()="Comprobante"]/@serie)[1]', 'varchar(20)')),
            @v_folio            = COALESCE(@x.value('(/*[local-name()="Comprobante"]/@Folio)[1]', 'varchar(30)'),
                                          @x.value('(/*[local-name()="Comprobante"]/@folio)[1]', 'varchar(30)')),
            @v_metodo_pago      = @x.value('(/*[local-name()="Comprobante"]/@MetodoPago)[1]', 'varchar(3)'),
            @v_forma_pago       = @x.value('(/*[local-name()="Comprobante"]/@FormaPago)[1]', 'varchar(2)'),
            @v_fecha_str        = COALESCE(@x.value('(/*[local-name()="Comprobante"]/@Fecha)[1]', 'varchar(25)'),
                                          @x.value('(/*[local-name()="Comprobante"]/@fecha)[1]', 'varchar(25)')),
            @v_importe          = CAST(NULLIF(COALESCE(@x.value('(/*[local-name()="Comprobante"]/@SubTotal)[1]', 'varchar(30)'),
                                                 @x.value('(/*[local-name()="Comprobante"]/@subTotal)[1]', 'varchar(30)')), '') AS MONEY),
            @v_total            = CAST(NULLIF(COALESCE(@x.value('(/*[local-name()="Comprobante"]/@Total)[1]', 'varchar(30)'),
                                                 @x.value('(/*[local-name()="Comprobante"]/@total)[1]', 'varchar(30)')), '') AS MONEY),
            @v_rfc_emisor       = COALESCE(@x.value('(/*[local-name()="Comprobante"]/*[local-name()="Emisor"]/@Rfc)[1]', 'varchar(13)'),
                                          @x.value('(/*[local-name()="Comprobante"]/*[local-name()="Emisor"]/@rfc)[1]', 'varchar(13)')),
            @v_nombre_emisor    = COALESCE(@x.value('(/*[local-name()="Comprobante"]/*[local-name()="Emisor"]/@Nombre)[1]', 'varchar(100)'),
                                          @x.value('(/*[local-name()="Comprobante"]/*[local-name()="Emisor"]/@nombre)[1]', 'varchar(100)')),
            @v_regimen_emisor   = COALESCE(@x.value('(/*[local-name()="Comprobante"]/*[local-name()="Emisor"]/@RegimenFiscal)[1]', 'varchar(3)'),
                                          @x.value('(/*[local-name()="Comprobante"]/*[local-name()="Emisor"]/*[local-name()="RegimenFiscal"]/@Regimen)[1]', 'varchar(3)')),
            @v_cp_emisor        = COALESCE(@x.value('(/*[local-name()="Comprobante"]/*[local-name()="Emisor"]/@DomicilioFiscalEstablecimiento)[1]', 'varchar(5)'),
                                          @x.value('(/*[local-name()="Comprobante"]/*[local-name()="Emisor"]/*[local-name()="DomicilioFiscal"]/@codigoPostal)[1]', 'varchar(5)'),
                                          @x.value('(/*[local-name()="Comprobante"]/@LugarExpedicion)[1]', 'varchar(5)')),
            @v_rfc_receptor     = COALESCE(@x.value('(/*[local-name()="Comprobante"]/*[local-name()="Receptor"]/@Rfc)[1]', 'varchar(13)'),
                                          @x.value('(/*[local-name()="Comprobante"]/*[local-name()="Receptor"]/@rfc)[1]', 'varchar(13)')),
            @v_nombre_receptor  = COALESCE(@x.value('(/*[local-name()="Comprobante"]/*[local-name()="Receptor"]/@Nombre)[1]', 'varchar(100)'),
                                          @x.value('(/*[local-name()="Comprobante"]/*[local-name()="Receptor"]/@nombre)[1]', 'varchar(100)')),
            @v_regimen_receptor = @x.value('(/*[local-name()="Comprobante"]/*[local-name()="Receptor"]/@RegimenFiscalReceptor)[1]', 'varchar(3)'),
            @v_cp_receptor      = COALESCE(@x.value('(/*[local-name()="Comprobante"]/*[local-name()="Receptor"]/@DomicilioFiscalReceptor)[1]', 'varchar(5)'),
                                          @x.value('(/*[local-name()="Comprobante"]/*[local-name()="Receptor"]/*[local-name()="Domicilio"]/@codigoPostal)[1]', 'varchar(5)'));

        /* Mapear el tipo de comprobante de 3.2 (texto) a la clave de 1 carácter.
           3.3/4.0 ya traen I/E/T/N/P y se conservan igual. */
        SET @v_tipo_comprobante = CASE @v_tipo_raw
            WHEN 'ingreso' THEN 'I'
            WHEN 'egreso'  THEN 'E'
            WHEN 'traslado' THEN 'T'
            ELSE @v_tipo_raw END;

        SET @v_fecha = TRY_CONVERT(smalldatetime, REPLACE(@v_fecha_str, 'T', ' '), 120);

        /* 4. TRANSACCIÓN Y CLASIFICACIÓN (EMITIDO VS RECIBIDO) */
        BEGIN TRANSACTION;
        SAVE TRANSACTION sp_imp;

        IF @v_rfc_emisor = @p_mi_rfc
        BEGIN
            /* =============================================================
               CASO A: CFDI EMITIDO
               ============================================================= */
            MERGE cfdi_emitidos AS target
            USING (SELECT
                @v_uuid_str, @v_tipo_comprobante, @v_serie, @v_folio, @v_fecha,
                @v_metodo_pago, @v_forma_pago, @v_rfc_receptor, @v_nombre_receptor,
                @v_cp_receptor, @v_regimen_receptor, @v_importe, @v_total,
                @v_cfdi_version
            ) AS source (UUID, tipoComprobante, serie, folio, fecha, metodoPago,
                formaPago, rfcReceptor, nombreReceptor, codigoPostalReceptor,
                regimenFiscalReceptor, importe, total, cfdiVersion)
            ON target.UUID = source.UUID
            WHEN MATCHED THEN
                UPDATE SET
                    tipoComprobante = source.tipoComprobante,
                    serie = source.serie,
                    folio = source.folio,
                    fecha = source.fecha,
                    metodoPago = source.metodoPago,
                    formaPago = source.formaPago,
                    rfcReceptor = source.rfcReceptor,
                    nombreReceptor = source.nombreReceptor,
                    codigoPostalReceptor = source.codigoPostalReceptor,
                    regimenFiscalReceptor = source.regimenFiscalReceptor,
                    cfdiVersion = source.cfdiVersion,
                    importe = source.importe,
                    total = source.total
            WHEN NOT MATCHED THEN
                INSERT (UUID, tipoComprobante, serie, folio, fecha, metodoPago,
                    formaPago, rfcReceptor, nombreReceptor, codigoPostalReceptor,
                    regimenFiscalReceptor, cfdiVersion, importe, total)
                VALUES (source.UUID, source.tipoComprobante, source.serie, source.folio,
                    source.fecha, source.metodoPago, source.formaPago, source.rfcReceptor,
                    source.nombreReceptor, source.codigoPostalReceptor,
                    source.regimenFiscalReceptor, source.cfdiVersion, source.importe, source.total);

            MERGE cfdi_emitidos_raw AS target
            USING (SELECT @v_uuid_str AS UUID,
                           @p_xml_raw AS xmlRawData) AS source
            ON target.UUID = source.UUID
            WHEN MATCHED THEN
                UPDATE SET xmlRawData = source.xmlRawData
            WHEN NOT MATCHED THEN
                INSERT (UUID, xmlRawData) VALUES (source.UUID, source.xmlRawData);

            /* A.1 RETENCIONES EMITIDAS (3.2 usa impuesto ISR/IVA; 3.3/4.0 usan 001/002/003) */
            INSERT INTO @retenciones (id, impuesto, importe)
            SELECT
                ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS id,
                CASE COALESCE(t.c.value('@Impuesto', 'varchar(3)'), t.c.value('@impuesto', 'varchar(3)'))
                    WHEN '001' THEN 1 WHEN '002' THEN 2 WHEN '003' THEN 3
                    WHEN 'ISR' THEN 1 WHEN 'IVA' THEN 2 ELSE 99 END,
                CAST(NULLIF(COALESCE(t.c.value('@Importe', 'varchar(30)'), t.c.value('@importe', 'varchar(30)')), '') AS money)
            FROM @x.nodes('/*[local-name()="Comprobante"]/*[local-name()="Impuestos"]/*[local-name()="Retenciones"]/*[local-name()="Retencion"]') AS t(c);

            MERGE cfdi_emitidos_retenciones AS target
            USING @retenciones AS source
            ON target.UUID = @v_uuid_str AND target.id = source.id
            WHEN MATCHED THEN
                UPDATE SET impuesto = source.impuesto, importe = source.importe
            WHEN NOT MATCHED THEN
                INSERT (UUID, id, impuesto, importe)
                VALUES (@v_uuid_str, source.id, source.impuesto, source.importe);

            /* A.2 COMPLEMENTO DE PAGO EMITIDO (local-name() cubre Pagos 1.0 en 3.3 y Pagos20 en 4.0) */
            IF @v_tipo_comprobante = 'P'
            BEGIN
                INSERT INTO @pagos (id, doctoRelacionado, fechaPago, formaPago, montoPago, numCuenta)
                SELECT
                    ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS id,
                    TRY_CONVERT(uniqueidentifier, t.c.value('@IdDocumento', 'char(36)')),
                    TRY_CONVERT(smalldatetime, REPLACE(t.c.value('../@FechaPago', 'varchar(25)'), 'T', ' '), 120),
                    t.c.value('../@FormaDePagoP', 'varchar(2)'),
                    CAST(NULLIF(t.c.value('@ImpPagado', 'varchar(30)'), '') AS money),
                    NULLIF(t.c.value('../@CtaOrdenante', 'varchar(18)'), '')
                FROM @x.nodes('/*[local-name()="Comprobante"]/*[local-name()="Complemento"]/*[local-name()="Pagos"]/*[local-name()="Pago"]/*[local-name()="DoctoRelacionado"]') AS t(c);

                MERGE cfdi_emitidos_pagos AS target
                USING @pagos AS source
                ON target.UUID = @v_uuid_str AND target.id = source.id
                WHEN MATCHED THEN
                    UPDATE SET
                        doctoRelacionado = source.doctoRelacionado,
                        fechaPago = source.fechaPago,
                        formaPago = source.formaPago,
                        montoPago = source.montoPago,
                        numCuenta = source.numCuenta
                WHEN NOT MATCHED THEN
                    INSERT (UUID, id, doctoRelacionado, fechaPago, formaPago, montoPago, numCuenta)
                    VALUES (@v_uuid_str, source.id, source.doctoRelacionado, source.fechaPago,
                        source.formaPago, source.montoPago, source.numCuenta);
            END

            /* A.3 COMPLEMENTO DE NÓMINA EMITIDO (local-name() cubre nomina12 en 3.3/4.0) */
            IF @x.exist('/*[local-name()="Comprobante"]/*[local-name()="Complemento"]/*[local-name()="Nomina"]') = 1
            BEGIN
                SELECT
                    @n_curp            = @x.value('(/*[local-name()="Comprobante"]/*[local-name()="Complemento"]/*[local-name()="Nomina"]/*[local-name()="Receptor"]/@Curp)[1]', 'varchar(18)'),
                    @n_fechaPago       = TRY_CONVERT(smalldatetime, @x.value('(/*[local-name()="Comprobante"]/*[local-name()="Complemento"]/*[local-name()="Nomina"]/@FechaPago)[1]', 'varchar(10)'), 120),
                    @n_fechaInicial    = TRY_CONVERT(smalldatetime, @x.value('(/*[local-name()="Comprobante"]/*[local-name()="Complemento"]/*[local-name()="Nomina"]/@FechaInicialPago)[1]', 'varchar(10)'), 120),
                    @n_fechaFinal      = TRY_CONVERT(smalldatetime, @x.value('(/*[local-name()="Comprobante"]/*[local-name()="Complemento"]/*[local-name()="Nomina"]/@FechaFinalPago)[1]', 'varchar(10)'), 120),
                    @n_percepciones    = CAST(NULLIF(@x.value('(/*[local-name()="Comprobante"]/*[local-name()="Complemento"]/*[local-name()="Nomina"]/@TotalPercepciones)[1]', 'varchar(30)'), '') AS money),
                    @n_deducciones     = CAST(NULLIF(@x.value('(/*[local-name()="Comprobante"]/*[local-name()="Complemento"]/*[local-name()="Nomina"]/@TotalDeducciones)[1]', 'varchar(30)'), '') AS money),
                    @n_isr             = CAST(NULLIF(@x.value('(/*[local-name()="Comprobante"]/*[local-name()="Complemento"]/*[local-name()="Nomina"]//*[@TotalImpuestosRetenidos][1]/@TotalImpuestosRetenidos)[1]', 'varchar(30)'), '') AS money);

                MERGE cfdi_emitidos_nomina AS target
                USING (SELECT
                    @v_uuid_str, @n_curp, @n_fechaPago, @n_fechaInicial, @n_fechaFinal,
                    @n_percepciones, @n_deducciones, @n_isr
                ) AS source (UUID, curp, fechaPago, fechaInicial, fechaFinal, percepciones, deducciones, isrRetenido)
                ON target.UUID = source.UUID
                WHEN MATCHED THEN
                    UPDATE SET
                        curp = source.curp,
                        fechaPago = source.fechaPago,
                        fechaInicial = source.fechaInicial,
                        fechaFinal = source.fechaFinal,
                        percepciones = source.percepciones,
                        deducciones = source.deducciones,
                        isrRetenido = source.isrRetenido
                WHEN NOT MATCHED THEN
                    INSERT (UUID, curp, fechaPago, fechaInicial, fechaFinal, percepciones, deducciones, isrRetenido)
                    VALUES (source.UUID, source.curp, source.fechaPago, source.fechaInicial,
                        source.fechaFinal, source.percepciones, source.deducciones, source.isrRetenido);
            END
        END

        IF @v_rfc_receptor = @p_mi_rfc
        BEGIN
            /* =============================================================
               CASO B: CFDI RECIBIDO
               ============================================================= */
            MERGE cfdi_recibidos AS target
            USING (SELECT
                @v_uuid_str, @v_tipo_comprobante, @v_serie, @v_folio, @v_fecha,
                @v_metodo_pago, @v_forma_pago, @v_rfc_emisor, @v_nombre_emisor,
                @v_regimen_emisor, @v_cp_emisor, @v_importe, @v_total,
                @v_cfdi_version
            ) AS source (UUID, tipoComprobante, serie, folio, fecha, metodoPago,
                formaPago, rfcEmisor, nombreEmisor, regimenFiscalEmisor,
                codigoPostalEmisor, importe, total, cfdiVersion)
            ON target.UUID = source.UUID
            WHEN MATCHED THEN
                UPDATE SET
                    tipoComprobante = source.tipoComprobante,
                    serie = source.serie,
                    folio = source.folio,
                    fecha = source.fecha,
                    metodoPago = source.metodoPago,
                    formaPago = source.formaPago,
                    rfcEmisor = source.rfcEmisor,
                    nombreEmisor = source.nombreEmisor,
                    regimenFiscalEmisor = source.regimenFiscalEmisor,
                    codigoPostalEmisor = source.codigoPostalEmisor,
                    cfdiVersion = source.cfdiVersion,
                    importe = source.importe,
                    total = source.total
            WHEN NOT MATCHED THEN
                INSERT (UUID, tipoComprobante, serie, folio, fecha, metodoPago,
                    formaPago, rfcEmisor, nombreEmisor, regimenFiscalEmisor,
                    codigoPostalEmisor, cfdiVersion, importe, total)
                VALUES (source.UUID, source.tipoComprobante, source.serie, source.folio,
                    source.fecha, source.metodoPago, source.formaPago, source.rfcEmisor,
                    source.nombreEmisor, source.regimenFiscalEmisor,
                    source.codigoPostalEmisor, source.cfdiVersion, source.importe, source.total);

            MERGE cfdi_recibidos_raw AS target
            USING (SELECT @v_uuid_str AS UUID,
                           @p_xml_raw AS xmlRawData) AS source
            ON target.UUID = source.UUID
            WHEN MATCHED THEN
                UPDATE SET xmlRawData = source.xmlRawData
            WHEN NOT MATCHED THEN
                INSERT (UUID, xmlRawData) VALUES (source.UUID, source.xmlRawData);

            /* B.1 RETENCIONES RECIBIDAS */
            DELETE FROM @retenciones;
            INSERT INTO @retenciones (id, impuesto, importe)
            SELECT
                ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS id,
                CASE COALESCE(t.c.value('@Impuesto', 'varchar(3)'), t.c.value('@impuesto', 'varchar(3)'))
                    WHEN '001' THEN 1 WHEN '002' THEN 2 WHEN '003' THEN 3
                    WHEN 'ISR' THEN 1 WHEN 'IVA' THEN 2 ELSE 99 END,
                CAST(NULLIF(COALESCE(t.c.value('@Importe', 'varchar(30)'), t.c.value('@importe', 'varchar(30)')), '') AS money)
            FROM @x.nodes('/*[local-name()="Comprobante"]/*[local-name()="Impuestos"]/*[local-name()="Retenciones"]/*[local-name()="Retencion"]') AS t(c);

            MERGE cfdi_recibidos_retenciones AS target
            USING @retenciones AS source
            ON target.UUID = @v_uuid_str AND target.id = source.id
            WHEN MATCHED THEN
                UPDATE SET impuesto = source.impuesto, importe = source.importe
            WHEN NOT MATCHED THEN
                INSERT (UUID, id, impuesto, importe)
                VALUES (@v_uuid_str, source.id, source.impuesto, source.importe);

            /* B.2 COMPLEMENTO DE PAGO RECIBIDO */
            IF @v_tipo_comprobante = 'P'
            BEGIN
                DELETE FROM @pagos;
                INSERT INTO @pagos (id, doctoRelacionado, fechaPago, formaPago, montoPago)
                SELECT
                    ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS id,
                    TRY_CONVERT(uniqueidentifier, t.c.value('@IdDocumento', 'char(36)')),
                    TRY_CONVERT(smalldatetime, REPLACE(t.c.value('../@FechaPago', 'varchar(25)'), 'T', ' '), 120),
                    t.c.value('../@FormaDePagoP', 'varchar(2)'),
                    CAST(NULLIF(t.c.value('@ImpPagado', 'varchar(30)'), '') AS money)
                FROM @x.nodes('/*[local-name()="Comprobante"]/*[local-name()="Complemento"]/*[local-name()="Pagos"]/*[local-name()="Pago"]/*[local-name()="DoctoRelacionado"]') AS t(c);

                MERGE cfdi_recibidos_pagos AS target
                USING @pagos AS source
                ON target.UUID = @v_uuid_str AND target.id = source.id
                WHEN MATCHED THEN
                    UPDATE SET
                        doctoRelacionado = source.doctoRelacionado,
                        fechaPago = source.fechaPago,
                        formaPago = source.formaPago,
                        montoPago = source.montoPago
                WHEN NOT MATCHED THEN
                    INSERT (UUID, id, doctoRelacionado, fechaPago, formaPago, montoPago)
                    VALUES (@v_uuid_str, source.id, source.doctoRelacionado, source.fechaPago,
                        source.formaPago, source.montoPago);
            END
        END

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
        BEGIN
            ROLLBACK TRANSACTION sp_imp;   -- deshace solo el trabajo del SP
            COMMIT TRANSACTION;            -- balancea el BEGIN del SP
        END
        ;THROW;
    END CATCH
END;
GO
