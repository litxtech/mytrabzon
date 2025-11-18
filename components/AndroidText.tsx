import React from 'react';
import { Text, TextProps, Platform } from 'react-native';

/**
 * Android için optimize edilmiş Text component
 * includeFontPadding={false} ile metinlerin tam görünmesini sağlar
 */
export function AndroidText({ style, ...props }: TextProps) {
  const androidStyle = Platform.OS === 'android' 
    ? { includeFontPadding: false } 
    : {};

  return (
    <Text 
      style={[androidStyle, style]} 
      {...props}
    />
  );
}

