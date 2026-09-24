/*
  Trigger para Nominas.dbo.Nominas_CFDI (SQL Server 2014/v12).

  Cada vez que se INSERTA un renglón en Nominas.dbo.Nominas_CFDI, se invoca
  cfdirepo.dbo.sp_importar_cfdi_v40 (otra BD del mismo servidor) pasandole
  el CFDI que viene en la columna [XML] (VARBINARY(MAX), bytes UTF-8 crudos)
  y el RFC fijo ISS9806125B3.

*/
USE SIGA;
GO

IF OBJECT_ID('dbo.trg_SIGA_CFDI_importa_cfdi', 'TR') IS NOT NULL
    DROP TRIGGER dbo.trg_SIGA_CFDI_importa_cfdi;
GO

CREATE TRIGGER dbo.trg_SIGA_CFDI_importa_cfdi ON dbo.XMLRepo_Data AFTER INSERT AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT OFF;   -- que un fallo del SP no aborte el INSERT

    DECLARE @xml VARBINARY(MAX);

    DECLARE cur CURSOR LOCAL FAST_FORWARD FOR
        SELECT [XML] FROM inserted;

    OPEN cur;
    FETCH NEXT FROM cur INTO @xml;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        BEGIN TRY
            EXEC cfdirepo.dbo.sp_importar_cfdi_v40 @p_xml_raw = @xml, @p_mi_rfc  = 'ISS9806125B3';
        END TRY
        BEGIN CATCH
            /* El INSERT en Nominas_CFDI ya ocurrio y se confirma igual.
               Aqui se podria registrar el fallo si se desea auditoria. */
        END CATCH

        FETCH NEXT FROM cur INTO @xml;
    END

    CLOSE cur;
    DEALLOCATE cur;
END;
GO
