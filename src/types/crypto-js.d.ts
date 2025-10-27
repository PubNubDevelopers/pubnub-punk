declare module 'crypto-js' {
  interface WordArray {
    toString(encoder?: Encoder): string;
  }

  interface Encoder {
    stringify(wordArray: WordArray): string;
  }

  interface Encoders {
    Base64: Encoder;
  }

  export function HmacSHA256(message: string, secret: string): WordArray;

  export const enc: Encoders;

  const CryptoJS: {
    HmacSHA256: typeof HmacSHA256;
    enc: typeof enc;
  };

  export default CryptoJS;
}
