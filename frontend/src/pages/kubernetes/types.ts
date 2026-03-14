export interface Namespace { name: string; status: string; }
export interface Pod { name: string; namespace: string; status: string; restarts: number; age: string; node: string; }
export interface Deployment { name: string; namespace: string; ready: string; age: string; }
export interface Service { name: string; namespace: string; type: string; cluster_ip: string; ports: string; }
export interface Cluster { id: string; name: string; status: string; provider: string; }
export interface NodeInfo { name: string; status: string; roles: string[]; ip: string; os: string; kubelet_version: string; age: string; }
