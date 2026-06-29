type HttpClientVerb = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface RequestOptions {
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

export default class HttpClient {
   private baseUrl: string;

   constructor(baseUrl: string) {
      this.baseUrl = baseUrl;
   }

   private getOptions (verb: HttpClientVerb, body?: unknown, token: string = '', options: RequestOptions = {}): RequestInit {
      return {
         method: verb,
         headers: {
            'Content-Type': 'application/json',
            'authorization': token ? token : 'NoToken',
            ...options.headers,
         },
         body: body ? JSON.stringify(body) : null,
         signal: options.signal,
      }
   }

   async request(verb: HttpClientVerb, path: string, body?: unknown, token: string = '', options?: RequestOptions) {
      return fetch(`${this.baseUrl}/${path}`, this.getOptions(verb, body, token, options));
   }

   async get(path: string, token: string = '', options?: RequestOptions) {
      return this.request('GET', path, undefined, token, options);
   }
   async post(path: string, body: unknown, token: string = '', options?: RequestOptions) {
      return this.request('POST', path, body, token, options);
   }
   async put(path: string, body: unknown, token: string = '', options?: RequestOptions) {
      return this.request('PUT', path, body, token, options);
   }
   async delete(path: string, token: string = '', options?: RequestOptions) {
      return this.request('DELETE', path, undefined, token, options);
   }

}