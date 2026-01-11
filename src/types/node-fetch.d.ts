declare module 'node-fetch' {
  import { RequestInfo, RequestInit, Response } from 'node-fetch';
  const fetch: (url: RequestInfo, init?: RequestInit) => Promise<Response>;
  export default fetch;
}
