export interface MicrosoftAccount {
  type: "microsoft";
  access_token: string;
  refresh_token: string;
  expires_at: number;
  profile?: {
    id: string;
    name: string;
  };
}

export interface YggdrasilAccount {
  id: string;
  type: "yggdrasil";
  serverUrl: string;
  serverName?: string;
  username: string;
  profile: {
    id: string;
    name: string;
  };
  accessToken: string;
  clientToken?: string;
}

export interface OfflineAccount {
  type: "offline";
  name: string;
  uuid: string;
}

export interface Account {
  type: "microsoft" | "yggdrasil" | "offline";
  name: string;
  uuid: string;
  expires_at?: number;
}
