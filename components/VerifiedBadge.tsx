import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Circle, Path } from 'react-native-svg';

type Props = {
  size?: number;
  style?: StyleProp<ViewStyle>;
};

const VerifiedBadge: React.FC<Props> = ({ size = 18, style }) => {
  const strokeWidth = Math.max(1.5, size * 0.12);

  return (
    <View style={[styles.wrapper, style, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Defs>
          <LinearGradient id="verifiedGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#37B7FF" />
            <Stop offset="100%" stopColor="#0BC8D8" />
          </LinearGradient>
        </Defs>
        <Circle cx="12" cy="12" r="11" fill="url(#verifiedGradient)" />
        <Circle cx="7" cy="7" r="3" fill="#5df5ff" opacity={0.4} />
        <Path
          d="M7 12.5l3.2 3.4L17.5 8"
          stroke="#fff"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default VerifiedBadge;

