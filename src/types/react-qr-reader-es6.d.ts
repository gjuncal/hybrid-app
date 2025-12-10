declare module 'react-qr-reader-es6' {
  import * as React from 'react';

  export interface QrReaderProps {
    delay?: number | false;
    onError?: (error: any) => void;
    onScan?: (data: string | null) => void;
    style?: React.CSSProperties;
    className?: string;
    facingMode?: 'user' | 'environment';
    legacyMode?: boolean;
    resolution?: number;
    showViewFinder?: boolean;
    constraints?: MediaTrackConstraints | null;
  }

  export default class QrReader extends React.Component<QrReaderProps> {
    openImageDialog: () => void;
  }
}