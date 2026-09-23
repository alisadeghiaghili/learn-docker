export type ContainerStatus = 'created' | 'running' | 'exited' | 'removed';

export interface ImageLayer {
  id: string;
  instruction: string;
  sizeKb: number;
}

export interface ImageRef {
  /** Full name including tag, e.g. `nginx:1.25` */
  name: string;
  repo: string;
  tag: string;
  imageId: string;
  layers: ImageLayer[];
  sizeKb: number;
  created: string;
  dangling?: boolean;
  parent?: string;
}

export interface PortBinding {
  hostPort: number;
  containerPort: number;
  protocol: 'tcp' | 'udp';
}

export interface Container {
  id: string;
  name: string;
  image: string;
  imageId: string;
  status: ContainerStatus;
  command: string;
  createdAt: string;
  ports: PortBinding[];
  env: Record<string, string>;
  volumeMounts: Array<{ volume: string; path: string }>;
  networks: string[];
  hostname: string;
  exitCode?: number;
  volumeData: Record<string, string>;
}

export interface Volume {
  name: string;
  createdAt: string;
  data: Record<string, string>;
  labels: Record<string, string>;
}

export interface Network {
  name: string;
  driver: 'bridge' | 'host' | 'none';
  subnet?: string;
  containers: string[];
  createdAt: string;
}

export interface DockerState {
  images: ImageRef[];
  containers: Container[];
  volumes: Volume[];
  networks: Network[];
  nextContainerSeq: number;
  nextImageSeq: number;
  nextNetworkSeq: number;
}

export interface RegistryImage {
  name: string;
  repo: string;
  tag: string;
  layers: ImageLayer[];
  sizeKb: number;
  description: string;
  dockerfile?: string[];
}

export interface LevelStep {
  /** Suggested command (for checklist + Tab hints). */
  command: string;
  /** What this step does and why it matters. */
  note: string;
  optional?: boolean;
}

export interface LevelDefinition {
  id: string;
  name: string;
  series: string;
  brief: string;
  /** Longer teaching narrative: what is happening and why. */
  teaching: string;
  /** Concrete checklist for the right panel. */
  steps: LevelStep[];
  fieldNotes?: string[];
  learning: string[];
  hint?: string;
  par: number;
  start?: Partial<DockerState> & {
    prePulled?: string[];
    preBuilt?: Array<{ name: string; from: string; layers: string[] }>;
  };
  check: (state: DockerState) => boolean;
}

export interface LevelProgress {
  solved: boolean;
  bestCommands: number | null;
  attempts: number;
}

export interface AppProgress {
  levels: Record<string, LevelProgress>;
}

export interface EngineOutput {
  lines: string[];
  ok: boolean;
  mode?: 'sandbox' | 'levels' | 'help';
  solved?: boolean;
  levelId?: string;
}
