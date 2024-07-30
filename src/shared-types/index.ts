export interface ProcessScriptData {
  action: 'process-script';
  script: string;
  port: MessagePort;
}

export interface ProcessSVGData {
  action: 'process-svg';
  script: string;
  port: MessagePort;
}

export interface ProcessResult {
  name: string;
  points: LinearData;
  duration: number;
}

export type LinearData = [pos: number, val: number][];

export interface BasicStackDetails {
  functionName: string;
}

export interface FullStackDetails extends BasicStackDetails {
  fileName: string;
  lineNumber: number;
  columnNumber: number;
}

export type StackDetails = BasicStackDetails | FullStackDetails;
type ErrorObj = { message: string };
export type PostMessageError = (StackDetails & ErrorObj) | ErrorObj;
