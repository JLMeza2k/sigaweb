import forge from "node-forge";

export interface CertificateInfo {
  certificate: forge.Certificate;
  privateKey: forge.PrivateKey;
  rfc: string;
}

export function parsePfx(buffer: ArrayBuffer, password: string): CertificateInfo {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = forge.util.encode64(binary);
  const p12Asn1 = forge.asn1.fromDer(forge.util.decode64(base64));
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password);

  let certPem = "";
  let keyPem = "";

  const keyBags = p12.getBags({ bagType: forge.oids.pkcs8ShroudedKeyBag });
  const keys = keyBags[forge.oids.pkcs8ShroudedKeyBag] ?? [];
  if (keys.length > 0 && keys[0].key) {
    keyPem = forge.pki.privateKeyToPem(keys[0].key);
  }

  const certBags = p12.getBags({ bagType: forge.oids.certBag });
  const certs = certBags[forge.oids.certBag] ?? [];
  if (certs.length > 0 && certs[0].cert) {
    certPem = forge.pki.certificateToPem(certs[0].cert);
  }

  const certificate = forge.pki.certificateFromPem(certPem);
  const privateKey = forge.pki.privateKeyFromPem(keyPem);
  const rfc = extractRfc(certificate);

  return { certificate, privateKey, rfc };
}

export function extractRfc(cert: forge.Certificate): string {
  const rfcPattern = /[A-Z&]{3,4}\d{6}[A-Z\d]{3}/;
  /* ----------------------------------------------------------------------------------  
    SAT FIEL (e.firma) guarda el RFC en `serialNumber` (OID 2.5.4.5) como "RFC / CURP"; 
    SAT CSD almacena el RFC en `x500UniqueIdentifier` (OID 2.5.4.45) como solo el RFC
  -----------------------------------------------------------------------------------*/
  const uniqueIdField = cert.subject.getField({ name: "x500UniqueIdentifier" }) ?? cert.subject.getField({ type: "2.5.4.45" });
  if (uniqueIdField?.value) {
    const match = uniqueIdField.value.match(rfcPattern);
    if (match) return match[0];
  }
  const serialField = cert.subject.getField({ name: "serialNumber" }) ?? cert.subject.getField({ type: forge.oids.serialNumber });
  if (serialField?.value) {
    const match = serialField.value.match(rfcPattern);
    if (match) return match[0];
  }
  return "";
}

// ── Http Utils ──────────────────────────────────────────────────────────

export function createDigest(sourceData: string): string {
  const message = forge.md.sha1.create();
  message.update(sourceData, "utf8");
  return forge.util.encode64(message.digest().getBytes());
}

export function sign(sourceData: string, certInfo: CertificateInfo): string {
  const message = forge.md.sha1.create();
  message.update(sourceData, "utf8");
  const sig = (certInfo.privateKey as unknown as { sign: (md: forge.Md) => string }).sign(message);
  return forge.util.encode64(sig);
}

export function makeWebRequest(url: string, soapAction: string): { url: string; method: "POST"; contentType: string; soapAction: string } {
  return { url, method: "POST", contentType: "text/xml; charset=utf-8", soapAction };
}

export async function sendRequest(xml: string, url: string, soapAction: string, authorization?: string, timeoutMs = 120000): Promise<Document> {
  const headers: Record<string, string> = { "Content-Type": "text/xml; charset=utf-8", SOAPAction: soapAction };
  if (authorization) headers["Authorization"] = authorization;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { method: "POST", headers, body: xml, signal: controller.signal });
    const text = await response.text();
    return new DOMParser().parseFromString(text, "application/xml");
  } finally {
    clearTimeout(timer);
  }
}

// ── Make XMLs ───────────────────────────────────────────────────────────
export function makeXMLAutenticacion(certInfo: CertificateInfo): string {
  const now = new Date(), created = formatDate(now), expires = formatDate(new Date(now.getTime() + 300_000));
  const uuid = `uuid-${crypto.randomUUID()}-4`;
  const canonicalTimestamp =
    `<u:Timestamp xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd" u:Id="_0">` +
    `<u:Created>${created}</u:Created><u:Expires>${expires}</u:Expires></u:Timestamp>`;
  const digest = createDigest(canonicalTimestamp);
  const canonicalSignedInfo =
    `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">` +
    `<CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"></CanonicalizationMethod>` +
    `<SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"></SignatureMethod>` +
    `<Reference URI="#_0">` +
    `<Transforms><Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"></Transform></Transforms>` +
    `<DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"></DigestMethod>` +
    `<DigestValue>${digest}</DigestValue>` +
    `</Reference></SignedInfo>`;

  const signature = sign(canonicalSignedInfo, certInfo);
  const cerData = getCertBase64(certInfo);

  return (
    `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd"><s:Header>` +
    `<ActivityId CorrelationId="c5478a6f-8f27-43f4-bc97-bea17612517c" xmlns="http//schemas.microsoft.com/2004/09/ServiceModel/Diagnostics">00000000-0000-0000-0000-000000000000</ActivityId>` +
    `<o:Security s:mustUnderstand="1" xmlns:o="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">` +
    `<u:Timestamp u:Id="_0"><u:Created>${created}</u:Created><u:Expires>${expires}</u:Expires></u:Timestamp><o:BinarySecurityToken u:Id="${uuid}" ` +
    `ValueType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-x509-token-profile-1.0#X509v3" ` +
    `EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary">${cerData}</o:BinarySecurityToken>` +
    `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">${canonicalSignedInfo}<SignatureValue>${signature}</SignatureValue><KeyInfo>` +
    `<o:SecurityTokenReference>` +
    `<o:Reference ValueType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-x509-token-profile-1.0#X509v3" URI="#${uuid}"/>` +
    `</o:SecurityTokenReference></KeyInfo></Signature></o:Security></s:Header><s:Body><Autentica xmlns="http://DescargaMasivaTerceros.gob.mx"/></s:Body></s:Envelope>`
  );
}

export function makeXMLSolicitud(certInfo: CertificateInfo, params: {
  emitidos: boolean; rfcSolicitante: string; rfcEmisor: string; rfcReceptor: string; fechaInicial: string; fechaFinal: string;
  tipoSolicitud?: string; tipoComprob?: string; estadoComprobante?: string;
}): string {
  const { emitidos, rfcSolicitante, rfcEmisor, rfcReceptor, fechaInicial, fechaFinal, tipoSolicitud = "CFDI", tipoComprob = "", estadoComprobante = "Vigente" } = params;
  const dir = emitidos ? "Emitidos" : "Recibidos";
  const rfcAttr = emitidos ? "RfcEmisor" : "RfcReceptor";
  let rfcEspecifico = ""
  if (emitidos && rfcReceptor.length > 0) rfcEspecifico = `<des:RfcReceptores><des:RfcReceptor>${rfcReceptor}</des:RfcReceptor></des:RfcReceptores>`
  if (!emitidos && rfcEmisor.length > 0) rfcEspecifico = ` RfcEmisor="${rfcEmisor}"`

  let solicitud = `<des:SolicitaDescarga${dir}><des:solicitud EstadoComprobante="${estadoComprobante}" ` +
    `FechaInicial="${fechaInicial}T00:00:00" FechaFinal="${fechaFinal}T23:59:59" ` +
    `TipoSolicitud="${tipoSolicitud}" ${rfcAttr}="${rfcSolicitante}" ` + (!emitidos && rfcEmisor.length > 0 ? rfcEspecifico : '') +
    (tipoComprob.length > 0 ? ` TipoComprobante="${tipoComprob}"` : "") + `>`;
  if (emitidos && rfcReceptor.length > 0) solicitud += rfcEspecifico;

  const solicitudDigest = createDigest(solicitud + `</des:solicitud></des:SolicitaDescarga${dir}>`);
  let canonicalSignedInfo = `<SignedInfo><CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>` +
    `<SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/><Reference URI="">` +
    `<Transforms><Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/></Transforms>` +
    `<DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>` +
    `<DigestValue>${solicitudDigest}</DigestValue></Reference></SignedInfo>`;

  const signature = sign(canonicalSignedInfo, certInfo);
  const cerData = getCertBase64(certInfo);
  const issuerCn = certInfo.certificate.issuer.getField("CN")?.value ?? "";
  const serialNumber = certInfo.certificate.serialNumber;

  return (
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:des="http://DescargaMasivaTerceros.sat.gob.mx" xmlns:xd="http://www.w3.org/2000/09/xmldsig#">` +
    `<soapenv:Header/><soapenv:Body>${solicitud}<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">${canonicalSignedInfo}` +
    `<SignatureValue>${signature}</SignatureValue><KeyInfo><X509Data><X509IssuerSerial><X509IssuerName>${issuerCn}</X509IssuerName>` +
    `<X509SerialNumber>${serialNumber}</X509SerialNumber></X509IssuerSerial><X509Certificate>${cerData}</X509Certificate>` +
    `</X509Data></KeyInfo></Signature></des:solicitud></des:SolicitaDescarga${dir}></soapenv:Body></soapenv:Envelope>`
  );
}

export function makeXMLSolicitudByUUID(
  certInfo: CertificateInfo,
  uuid: string,
): string {
  const tipoSolicitud = "CFDI";

  const canonicalBody =
    `<SolicitaDescarga xmlns="http://DescargaMasivaTerceros.sat.gob.mx">` +
    `<solicitud UUID="${uuid}" TipoSolicitud="${tipoSolicitud}" RfcACuentaTerceros="">` +
    `<RfcReceptores><RfcReceptor></RfcReceptor></RfcReceptores>` +
    `</solicitud></SolicitaDescarga>`;

  const digest = createDigest(canonicalBody);

  const canonicalSignedInfo =
    `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">` +
    `<CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"></CanonicalizationMethod>` +
    `<SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"></SignatureMethod>` +
    `<Reference URI="#_0">` +
    `<Transforms><Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"></Transform></Transforms>` +
    `<DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"></DigestMethod>` +
    `<DigestValue>${digest}</DigestValue>` +
    `</Reference></SignedInfo>`;

  const signature = sign(canonicalSignedInfo, certInfo);
  const cerData = getCertBase64(certInfo);
  const issuerCn = certInfo.certificate.issuer.getField("CN")?.value ?? "";
  const serialNumber = certInfo.certificate.serialNumber;

  return (
    `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd" xmlns:xd="http://www.w3.org/2000/09/xmldsig#">` +
    `<s:Header/>` +
    `<s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">` +
    `<SolicitaDescarga xmlns="http://DescargaMasivaTerceros.sat.gob.mx">` +
    `<solicitud UUID="${uuid}" TipoSolicitud="${tipoSolicitud}" RfcACuentaTerceros="">` +
    `<RfcReceptores><RfcReceptor></RfcReceptor></RfcReceptores>` +
    `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">` +
    canonicalSignedInfo +
    `<SignatureValue>${signature}</SignatureValue>` +
    `<KeyInfo>` +
    `<X509Data><X509IssuerSerial>` +
    `<X509IssuerName>${issuerCn}</X509IssuerName>` +
    `<X509SerialNumber>${serialNumber}</X509SerialNumber>` +
    `</X509IssuerSerial>` +
    `<X509Certificate>${cerData}</X509Certificate>` +
    `</X509Data></KeyInfo></Signature>` +
    `</solicitud></SolicitaDescarga>` +
    `</s:Body></s:Envelope>`
  );
}

export function makeXMLValidacion(
  certInfo: CertificateInfo,
  rfcSolicitante: string,
  idSolicitud: string,
): string {
  const verifica =
    `<des:VerificaSolicitudDescarga><des:solicitud IdSolicitud="${idSolicitud}" RfcSolicitante="${rfcSolicitante}">`;
  const endVerifica = `</des:solicitud></des:VerificaSolicitudDescarga>`;
  const digest = createDigest(verifica + endVerifica);

  let canonicalSignedInfo =
    `<SignedInfo>` +
    `<CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>` +
    `<SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>`;
  canonicalSignedInfo +=
    `<Reference URI="">` +
    `<Transforms><Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/></Transforms>`;
  canonicalSignedInfo +=
    `<DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>` +
    `<DigestValue>${digest}</DigestValue>` +
    `</Reference></SignedInfo>`;

  const signature = sign(canonicalSignedInfo, certInfo);
  const cerData = getCertBase64(certInfo);
  const issuerCn = certInfo.certificate.issuer.getField("CN")?.value ?? "";
  const serialNumber = certInfo.certificate.serialNumber;

  return (
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:des="http://DescargaMasivaTerceros.sat.gob.mx" xmlns:xd="http://www.w3.org/2000/09/xmldsig#">` +
    `<soapenv:Header/>` +
    `<soapenv:Body>` +
    verifica +
    `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">` +
    canonicalSignedInfo +
    `<SignatureValue>${signature}</SignatureValue>` +
    `<KeyInfo><X509Data><X509IssuerSerial>` +
    `<X509IssuerName>${issuerCn}</X509IssuerName>` +
    `<X509SerialNumber>${serialNumber}</X509SerialNumber>` +
    `</X509IssuerSerial>` +
    `<X509Certificate>${cerData}</X509Certificate>` +
    `</X509Data></KeyInfo></Signature>` +
    `</des:solicitud>` +
    `</des:VerificaSolicitudDescarga>` +
    `</soapenv:Body></soapenv:Envelope>`
  );
}

export function makeXMLDescargar(
  certInfo: CertificateInfo,
  rfcSolicitante: string,
  idPaquete: string,
): string {
  const descarga =
    `<des:PeticionDescargaMasivaTercerosEntrada>` +
    `<des:peticionDescarga IdPaquete="${idPaquete}" RfcSolicitante="${rfcSolicitante}">`;
  const endDescarga = `</des:peticionDescarga></des:PeticionDescargaMasivaTercerosEntrada>`;
  const digest = createDigest(descarga + endDescarga);

  let canonicalSignedInfo =
    `<SignedInfo>` +
    `<CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>` +
    `<SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>`;
  canonicalSignedInfo +=
    `<Reference URI="">` +
    `<Transforms><Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/></Transforms>`;
  canonicalSignedInfo +=
    `<DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>` +
    `<DigestValue>${digest}</DigestValue>` +
    `</Reference></SignedInfo>`;

  const signature = sign(canonicalSignedInfo, certInfo);
  const cerData = getCertBase64(certInfo);
  const issuerCn = certInfo.certificate.issuer.getField("CN")?.value ?? "";
  const serialNumber = certInfo.certificate.serialNumber;

  return (
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:des="http://DescargaMasivaTerceros.sat.gob.mx" xmlns:xd="http://www.w3.org/2000/09/xmldsig#">` +
    `<soapenv:Header/>` +
    `<soapenv:Body>` +
    descarga +
    `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">` +
    canonicalSignedInfo +
    `<SignatureValue>${signature}</SignatureValue>` +
    `<KeyInfo><X509Data><X509IssuerSerial>` +
    `<X509IssuerName>${issuerCn}</X509IssuerName>` +
    `<X509SerialNumber>${serialNumber}</X509SerialNumber>` +
    `</X509IssuerSerial>` +
    `<X509Certificate>${cerData}</X509Certificate>` +
    `</X509Data></KeyInfo></Signature>` +
    `</des:peticionDescarga>` +
    `</des:PeticionDescargaMasivaTercerosEntrada>` +
    `</soapenv:Body></soapenv:Envelope>`
  );
}

// ── PFX Creation ──────────────────────────────────────────────────────

export function parseCert(buffer: ArrayBuffer): forge.Certificate {
  const bytes = bufferToBinaryString(buffer);
  if (bytes.startsWith("-----BEGIN")) {
    return forge.pki.certificateFromPem(bytes);
  }
  return forge.pki.certificateFromAsn1(forge.asn1.fromDer(bytes));
}

export function parseKey(pemOrBuffer: string | ArrayBuffer): forge.PrivateKey {
  if (typeof pemOrBuffer === "string") {
    return forge.pki.privateKeyFromPem(pemOrBuffer);
  }
  const bytes = bufferToBinaryString(pemOrBuffer);
  if (bytes.startsWith("-----BEGIN")) {
    return forge.pki.privateKeyFromPem(bytes);
  }
  return forge.pki.privateKeyFromAsn1(forge.asn1.fromDer(bytes));
}

export function createPfx(certBuffer: ArrayBuffer, keyBuffer: ArrayBuffer | string, password: string): ArrayBuffer {
  const cert = parseCert(certBuffer);
  const key = parseKey(keyBuffer);
  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(key, cert, password, { algorithm: "3des" });
  const der = forge.asn1.toDer(p12Asn1).getBytes();
  return binaryStringToBuffer(der);
}

export function decryptSatKey(keyBuffer: ArrayBuffer, password: string): string {
  const bytes = bufferToBinaryString(keyBuffer);
  if (bytes.startsWith("-----BEGIN")) {
    const key = forge.pki.decryptRsaPrivateKey(bytes, password);
    if (!key) throw new Error("Contraseña incorrecta o archivo .key inválido");
    return forge.pki.privateKeyToPem(key);
  }

  const b64 = forge.util.encode64(bytes);
  const lines = b64.match(/.{1,64}/g) ?? [];
  const pem = "-----BEGIN ENCRYPTED PRIVATE KEY-----\r\n" + lines.join("\r\n") + "\r\n-----END ENCRYPTED PRIVATE KEY-----\r\n";
  const key = forge.pki.decryptRsaPrivateKey(pem, password);
  if (!key) throw new Error("Contraseña incorrecta o archivo .key inválido");
  return forge.pki.privateKeyToPem(key);
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatDate(d: Date): string {
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}.${String(d.getUTCMilliseconds()).padStart(3, "0")}Z`
  );
}

function getCertBase64(certInfo: CertificateInfo): string {
  const asn1 = forge.pki.certificateToAsn1(certInfo.certificate);
  const der = forge.asn1.toDer(asn1).getBytes();
  return forge.util.encode64(der);
}

function bufferToBinaryString(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return binary;
}

function binaryStringToBuffer(binary: string): ArrayBuffer {
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return buffer;
}
