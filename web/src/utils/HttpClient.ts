type HttpClientVerb = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export default class HttpClient {
   private baseUrl: string;

   constructor(baseUrl: string) {
      this.baseUrl = baseUrl;
   }

   private getOptions (verb: HttpClientVerb, body?: unknown, token: string = ''): RequestInit {
      return {
         method: verb,
         headers: {
            'Content-Type': 'application/json',
            'authorization': token ? token : 'NoToken'
            //'Acept': 'application/json'
         },
         body: body ? JSON.stringify(body) : null,
      }
   }

   async get(path: string, token: string = '') {
      return fetch(`${this.baseUrl}/${path}`, this.getOptions('GET', null, token));
   }
   async post(path: string, body: unknown, token: string = '') {
      return fetch(`${this.baseUrl}/${path}`, this.getOptions('POST', body, token));
   }
   async put(path: string, body: unknown, token: string = '') {
      return fetch(`${this.baseUrl}/${path}`, this.getOptions('PUT', body, token));
   }
   async delete(path: string, token: string = '') {
      return fetch(`${this.baseUrl}/${path}`, this.getOptions('DELETE', null, token));
   }

}