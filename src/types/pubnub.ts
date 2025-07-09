export interface PubNubConfig {
  publishKey: string;
  subscribeKey: string;
  secretKey?: string;
  userId: string;
  authKey?: string;
  origin?: string;
  ssl?: boolean;
  logVerbosity?: 'debug' | 'info' | 'error' | 'none';
  heartbeatInterval?: number;
}

export interface PubNubInstance {
  // Core messaging
  publish: (params: PublishParams) => Promise<PublishResponse>;
  subscribe: (params: SubscribeParams) => void;
  unsubscribe: (params: UnsubscribeParams) => void;
  unsubscribeAll: () => void;
  
  // Presence
  hereNow: (params: HereNowParams) => Promise<HereNowResponse>;
  whereNow: (params: WhereNowParams) => Promise<WhereNowResponse>;
  setPresenceState: (params: SetPresenceStateParams) => Promise<SetPresenceStateResponse>;
  getPresenceState: (params: GetPresenceStateParams) => Promise<GetPresenceStateResponse>;
  
  // History
  fetchMessages: (params: FetchMessagesParams) => Promise<FetchMessagesResponse>;
  deleteMessages: (params: DeleteMessagesParams) => Promise<DeleteMessagesResponse>;
  messageCounts: (params: MessageCountsParams) => Promise<MessageCountsResponse>;
  
  // Objects (App Context)
  objects: {
    setUUIDMetadata: (params: SetUUIDMetadataParams) => Promise<SetUUIDMetadataResponse>;
    getUUIDMetadata: (params: GetUUIDMetadataParams) => Promise<GetUUIDMetadataResponse>;
    getAllUUIDMetadata: (params: GetAllUUIDMetadataParams) => Promise<GetAllUUIDMetadataResponse>;
    removeUUIDMetadata: (params: RemoveUUIDMetadataParams) => Promise<RemoveUUIDMetadataResponse>;
    
    setChannelMetadata: (params: SetChannelMetadataParams) => Promise<SetChannelMetadataResponse>;
    getChannelMetadata: (params: GetChannelMetadataParams) => Promise<GetChannelMetadataResponse>;
    getAllChannelMetadata: (params: GetAllChannelMetadataParams) => Promise<GetAllChannelMetadataResponse>;
    removeChannelMetadata: (params: RemoveChannelMetadataParams) => Promise<RemoveChannelMetadataResponse>;
    
    setMemberships: (params: SetMembershipsParams) => Promise<SetMembershipsResponse>;
    getMemberships: (params: GetMembershipsParams) => Promise<GetMembershipsResponse>;
    removeMemberships: (params: RemoveMembershipsParams) => Promise<RemoveMembershipsResponse>;
    
    setChannelMembers: (params: SetChannelMembersParams) => Promise<SetChannelMembersResponse>;
    getChannelMembers: (params: GetChannelMembersParams) => Promise<GetChannelMembersResponse>;
    removeChannelMembers: (params: RemoveChannelMembersParams) => Promise<RemoveChannelMembersResponse>;
  };
  
  // Channel Groups
  channelGroups: {
    addChannels: (params: AddChannelsParams) => Promise<AddChannelsResponse>;
    removeChannels: (params: RemoveChannelsParams) => Promise<RemoveChannelsResponse>;
    listChannels: (params: ListChannelsParams) => Promise<ListChannelsResponse>;
    deleteGroup: (params: DeleteGroupParams) => Promise<DeleteGroupResponse>;
    listGroups: (params: ListGroupsParams) => Promise<ListGroupsResponse>;
  };
  
  // Files
  sendFile: (params: SendFileParams) => Promise<SendFileResponse>;
  listFiles: (params: ListFilesParams) => Promise<ListFilesResponse>;
  getFileUrl: (params: GetFileUrlParams) => string;
  downloadFile: (params: DownloadFileParams) => Promise<DownloadFileResponse>;
  deleteFile: (params: DeleteFileParams) => Promise<DeleteFileResponse>;
  
  // Mobile Push
  push: {
    addChannels: (params: PushAddChannelsParams) => Promise<PushAddChannelsResponse>;
    removeChannels: (params: PushRemoveChannelsParams) => Promise<PushRemoveChannelsResponse>;
    listChannels: (params: PushListChannelsParams) => Promise<PushListChannelsResponse>;
    deleteDevice: (params: PushDeleteDeviceParams) => Promise<PushDeleteDeviceResponse>;
  };
  
  // Access Manager
  grantToken: (params: GrantTokenParams) => Promise<GrantTokenResponse>;
  revokeToken: (params: RevokeTokenParams) => Promise<RevokeTokenResponse>;
  parseToken: (token: string) => ParsedToken;
  setToken: (token: string) => void;
  getToken: () => string | null;
  
  // Message Actions
  addMessageAction: (params: AddMessageActionParams) => Promise<AddMessageActionResponse>;
  removeMessageAction: (params: RemoveMessageActionParams) => Promise<RemoveMessageActionResponse>;
  getMessageActions: (params: GetMessageActionsParams) => Promise<GetMessageActionsResponse>;
  
  // Utilities
  time: () => Promise<TimeResponse>;
  addListener: (listener: PubNubListener) => void;
  removeListener: (listener: PubNubListener) => void;
  removeAllListeners: () => void;
  
  // Connection management
  reconnect: () => void;
  disconnect: () => void;
  destroy: () => void;
  
  // State
  getSubscribedChannels: () => string[];
  getSubscribedChannelGroups: () => string[];
}

// Event Listener Interface
export interface PubNubListener {
  message?: (event: MessageEvent) => void;
  presence?: (event: PresenceEvent) => void;
  signal?: (event: SignalEvent) => void;
  objects?: (event: ObjectsEvent) => void;
  messageAction?: (event: MessageActionEvent) => void;
  file?: (event: FileEvent) => void;
  status?: (event: StatusEvent) => void;
}

// Event Interfaces
export interface MessageEvent {
  channel: string;
  subscription?: string;
  message: any;
  timetoken: string;
  publisher: string;
  userMetadata?: any;
}

export interface PresenceEvent {
  action: 'join' | 'leave' | 'timeout' | 'state-change' | 'interval';
  channel: string;
  occupancy: number;
  state?: any;
  uuid: string;
  timestamp: number;
  timetoken: string;
  join?: string[];
  leave?: string[];
  timeout?: string[];
}

export interface SignalEvent {
  channel: string;
  subscription?: string;
  message: any;
  timetoken: string;
  publisher: string;
}

export interface ObjectsEvent {
  channel: string;
  message: {
    event: string;
    type: string;
    data: any;
  };
  timetoken: string;
}

export interface MessageActionEvent {
  channel: string;
  publisher: string;
  timetoken: string;
  data: {
    messageTimetoken: string;
    type: string;
    value: string;
    actionTimetoken: string;
    uuid: string;
  };
  event: 'added' | 'removed';
}

export interface FileEvent {
  channel: string;
  timetoken: string;
  publisher: string;
  message: {
    id: string;
    name: string;
    url: string;
  };
}

export interface StatusEvent {
  category: string;
  operation: string;
  affectedChannels?: string[];
  subscribedChannels?: string[];
  affectedChannelGroups?: string[];
  lastTimetoken?: string;
  currentTimetoken?: string;
}

// Parameter Interfaces
export interface PublishParams {
  channel: string;
  message: any;
  storeInHistory?: boolean;
  sendByPost?: boolean;
  meta?: any;
  ttl?: number;
}

export interface PublishResponse {
  timetoken: string;
}

export interface SubscribeParams {
  channels?: string[];
  channelGroups?: string[];
  withPresence?: boolean;
  timetoken?: string;
}

export interface UnsubscribeParams {
  channels?: string[];
  channelGroups?: string[];
}

// Additional parameter and response interfaces would be defined here...
// For brevity, I'm showing the pattern. In a real implementation, 
// you would define all the parameter and response interfaces for each method.

export interface HereNowParams {
  channels?: string[];
  channelGroups?: string[];
  includeUUIDs?: boolean;
  includeState?: boolean;
}

export interface HereNowResponse {
  totalChannels: number;
  totalOccupancy: number;
  channels: {
    [channel: string]: {
      occupancy: number;
      occupants?: {
        uuid: string;
        state?: any;
      }[];
    };
  };
}

export interface TimeResponse {
  timetoken: string;
}

// Connection error types
export interface ConnectionError extends Error {
  status?: {
    category: string;
    operation: string;
    errorData?: any;
  };
}

// Instance status tracking
export interface InstanceStatus {
  instanceId: string;
  isConnected: boolean;
  lastConnectionTest?: Date;
  error?: string;
  config: {
    userId: string;
    origin: string;
    ssl: boolean;
  };
}

// Hook configuration types (re-exported for convenience)
export interface PubNubHookOptions {
  userId?: string;
  instanceId?: string;
  autoConnect?: boolean;
  onConnectionError?: (error: string) => void;
  onConnectionSuccess?: () => void;
}

export interface PubNubHookResult {
  pubnub: PubNubInstance | null;
  isReady: boolean;
  isConnected: boolean;
  connectionError: string | null;
  reconnect: () => void;
  disconnect: () => void;
}

// Placeholder interfaces for methods not fully defined above
export interface WhereNowParams { uuid?: string; }
export interface WhereNowResponse { channels: string[]; }
export interface SetPresenceStateParams { channels?: string[]; channelGroups?: string[]; state: any; }
export interface SetPresenceStateResponse { state: any; }
export interface GetPresenceStateParams { channels?: string[]; channelGroups?: string[]; uuid?: string; }
export interface GetPresenceStateResponse { channels: { [channel: string]: any }; }
export interface FetchMessagesParams { channels: string[]; start?: string; end?: string; count?: number; includeMeta?: boolean; includeMessageActions?: boolean; includeUUID?: boolean; }
export interface FetchMessagesResponse { channels: { [channel: string]: { name: string; message: any; timetoken: string; }[] }; }
export interface DeleteMessagesParams { channel: string; start?: string; end?: string; }
export interface DeleteMessagesResponse { }
export interface MessageCountsParams { channels: string[]; timetoken?: string; channelTimetokens?: string[]; }
export interface MessageCountsResponse { channels: { [channel: string]: number }; }

// Objects API placeholders
export interface SetUUIDMetadataParams { uuid?: string; data: any; include?: any; }
export interface SetUUIDMetadataResponse { data: any; }
export interface GetUUIDMetadataParams { uuid?: string; include?: any; }
export interface GetUUIDMetadataResponse { data: any; }
export interface GetAllUUIDMetadataParams { include?: any; limit?: number; page?: any; filter?: string; sort?: any; }
export interface GetAllUUIDMetadataResponse { data: any[]; totalCount?: number; next?: string; prev?: string; }
export interface RemoveUUIDMetadataParams { uuid?: string; }
export interface RemoveUUIDMetadataResponse { }

export interface SetChannelMetadataParams { channel: string; data: any; include?: any; }
export interface SetChannelMetadataResponse { data: any; }
export interface GetChannelMetadataParams { channel: string; include?: any; }
export interface GetChannelMetadataResponse { data: any; }
export interface GetAllChannelMetadataParams { include?: any; limit?: number; page?: any; filter?: string; sort?: any; }
export interface GetAllChannelMetadataResponse { data: any[]; totalCount?: number; next?: string; prev?: string; }
export interface RemoveChannelMetadataParams { channel: string; }
export interface RemoveChannelMetadataResponse { }

export interface SetMembershipsParams { uuid?: string; channels: any[]; include?: any; limit?: number; page?: any; sort?: any; }
export interface SetMembershipsResponse { data: any[]; totalCount?: number; next?: string; prev?: string; }
export interface GetMembershipsParams { uuid?: string; include?: any; limit?: number; page?: any; filter?: string; sort?: any; }
export interface GetMembershipsResponse { data: any[]; totalCount?: number; next?: string; prev?: string; }
export interface RemoveMembershipsParams { uuid?: string; channels: string[]; }
export interface RemoveMembershipsResponse { data: any[]; totalCount?: number; next?: string; prev?: string; }

export interface SetChannelMembersParams { channel: string; uuids: any[]; include?: any; limit?: number; page?: any; sort?: any; }
export interface SetChannelMembersResponse { data: any[]; totalCount?: number; next?: string; prev?: string; }
export interface GetChannelMembersParams { channel: string; include?: any; limit?: number; page?: any; filter?: string; sort?: any; }
export interface GetChannelMembersResponse { data: any[]; totalCount?: number; next?: string; prev?: string; }
export interface RemoveChannelMembersParams { channel: string; uuids: string[]; }
export interface RemoveChannelMembersResponse { data: any[]; totalCount?: number; next?: string; prev?: string; }

// Channel Groups placeholders
export interface AddChannelsParams { channels: string[]; channelGroup: string; }
export interface AddChannelsResponse { }
export interface RemoveChannelsParams { channels: string[]; channelGroup: string; }
export interface RemoveChannelsResponse { }
export interface ListChannelsParams { channelGroup: string; }
export interface ListChannelsResponse { channels: string[]; }
export interface DeleteGroupParams { channelGroup: string; }
export interface DeleteGroupResponse { }
export interface ListGroupsParams { }
export interface ListGroupsResponse { groups: string[]; }

// Files placeholders
export interface SendFileParams { channel: string; file: File; message?: any; cipherKey?: string; storeInHistory?: boolean; ttl?: number; meta?: any; }
export interface SendFileResponse { timetoken: string; name: string; id: string; }
export interface ListFilesParams { channel: string; limit?: number; next?: string; }
export interface ListFilesResponse { data: any[]; next?: string; count: number; }
export interface GetFileUrlParams { channel: string; id: string; name: string; }
export interface DownloadFileParams { channel: string; id: string; name: string; cipherKey?: string; }
export interface DownloadFileResponse { }
export interface DeleteFileParams { channel: string; id: string; name: string; }
export interface DeleteFileResponse { }

// Push placeholders
export interface PushAddChannelsParams { channels: string[]; device: string; pushGateway: 'apns' | 'gcm' | 'apns2' | 'fcm'; environment?: 'development' | 'production'; topic?: string; }
export interface PushAddChannelsResponse { }
export interface PushRemoveChannelsParams { channels: string[]; device: string; pushGateway: 'apns' | 'gcm' | 'apns2' | 'fcm'; environment?: 'development' | 'production'; topic?: string; }
export interface PushRemoveChannelsResponse { }
export interface PushListChannelsParams { device: string; pushGateway: 'apns' | 'gcm' | 'apns2' | 'fcm'; environment?: 'development' | 'production'; topic?: string; }
export interface PushListChannelsResponse { channels: string[]; }
export interface PushDeleteDeviceParams { device: string; pushGateway: 'apns' | 'gcm' | 'apns2' | 'fcm'; environment?: 'development' | 'production'; topic?: string; }
export interface PushDeleteDeviceResponse { }

// Access Manager placeholders
export interface GrantTokenParams { ttl: number; resources?: any; patterns?: any; meta?: any; authorizedUUID?: string; }
export interface GrantTokenResponse { token: string; }
export interface RevokeTokenParams { token: string; }
export interface RevokeTokenResponse { }
export interface ParsedToken { resources: any; patterns: any; meta: any; authorizedUUID?: string; ttl: number; }

// Message Actions placeholders
export interface AddMessageActionParams { channel: string; messageTimetoken: string; action: { type: string; value: string; }; }
export interface AddMessageActionResponse { data: { messageTimetoken: string; type: string; value: string; actionTimetoken: string; uuid: string; }; }
export interface RemoveMessageActionParams { channel: string; messageTimetoken: string; actionTimetoken: string; }
export interface RemoveMessageActionResponse { data: any; }
export interface GetMessageActionsParams { channel: string; start?: string; end?: string; limit?: number; }
export interface GetMessageActionsResponse { data: any[]; more?: any; }