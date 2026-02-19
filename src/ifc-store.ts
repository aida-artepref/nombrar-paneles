export const ifcStore = {
  bytes: null as Uint8Array | null,
  name: null as string | null,
  dirty: false,

  fileHandle: null as FileSystemFileHandle | null, 

  overrides: new Map<string, string>(),

  reset(bytes: Uint8Array, name: string, fileHandle: FileSystemFileHandle | null = null) {
    this.bytes = bytes;
    this.name = name;
    this.fileHandle = fileHandle; 
    this.dirty = false;
    this.overrides.clear();
  },
};
