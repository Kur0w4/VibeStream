/// <reference types="vite/client" />

declare module 'react-dom/client' {
  export function createRoot(container: Element | DocumentFragment): any;
}

declare module 'react-router-dom' {
  export function BrowserRouter(props: any): any;
  export function Routes(props: any): any;
  export function Route(props: any): any;
  export function useNavigate(): any;
  export function useParams<T = any>(): T;
  export function Link(props: any): any;
  export function NavLink(props: any): any;
}

declare module 'youtube-search-without-api-key' {
  export function search(query: string): Promise<any[]>;
}

declare module 'bcryptjs' {
  export function hash(s: string, salt: number | string): Promise<string>;
  export function compare(s: string, hash: string): Promise<boolean>;
}

declare module 'better-sqlite3' {
  const Database: any;
  export default Database;
}

declare module 'express-session' {
  const session: any;
  export default session;
}
