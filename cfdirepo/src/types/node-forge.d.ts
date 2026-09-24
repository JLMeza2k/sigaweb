declare module "node-forge" {
  interface Md {
    update(msg: string, encoding?: string): Md;
    digest(): { getBytes(): string };
  }

  interface Pki {
    certificateFromPem(pem: string): Certificate;
    certificateFromAsn1(asn1: unknown): Certificate;
    certificateToPem(cert: Certificate): string;
    certificateToAsn1(cert: Certificate): unknown;
    privateKeyFromPem(pem: string): PrivateKey;
    privateKeyToPem(key: PrivateKey): string;
    privateKeyFromAsn1(asn1: unknown): PrivateKey;
    privateKeyToAsn1(key: PrivateKey): unknown;
    decryptRsaPrivateKey(pem: string, passphrase: string): PrivateKey | null;
    rsa: {
      generateKeyPair(options?: { bits?: number; e?: number; workers?: number }): {
        publicKey: PublicKey;
        privateKey: PrivateKey;
      };
    };
  }

  interface Certificate {
    subject: {
      getField(
        options: string | { name?: string; shortName?: string; type?: string },
      ): { value: string } | null;
    };
    issuer: { getField(name: string): { value: string } | null };
    serialNumber: string;
    validity: { notBefore: Date; notAfter: Date };
  }

  interface PrivateKey {
    sign(md: Md): string;
  }

  interface PublicKey {}

  interface Pkcs12 {
    getBags(filter: { bagType: string }): Record<string, Array<{ key?: PrivateKey; cert?: Certificate }>>;
  }

  interface Asn1 {
    fromDer(der: string): unknown;
    toDer(asn1: unknown): { getBytes(): string };
  }

  interface Util {
    encode64(input: string): string;
    decode64(encoded: string): string;
    createBuffer(input: string, encoding?: string): { bytes(): string };
  }

  interface MdFactory {
    sha1: { create(): Md };
  }

  const pki: Pki;
  const asn1: Asn1;
  const util: Util;
  const md: MdFactory;
  const oids: Record<string, string>;

  const pkcs12: {
    pkcs12FromAsn1(asn1: unknown, strict?: boolean, password?: string): Pkcs12;
    toPkcs12Asn1(
      privateKey: PrivateKey,
      cert: Certificate | Certificate[],
      password: string,
      options?: { algorithm?: "3des" | "aes256" },
    ): unknown;
  };
}

declare module "node-forge/lib/pkcs12" {}
declare module "node-forge/lib/x509" {}
declare module "node-forge/lib/rsa" {}
declare module "node-forge/lib/util" {}
declare module "node-forge/lib/md" {}
declare module "node-forge/lib/asn1" {}
declare module "node-forge/lib/oids" {}
