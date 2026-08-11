import React from 'react';
import { FloatingChatMenu, FloatingChatMenuProps } from './FloatingChatMenu';

export function CommunicationHub(props: FloatingChatMenuProps) {
  return <FloatingChatMenu {...props} />;
}

export { FloatingChatMenu };
export default CommunicationHub;
