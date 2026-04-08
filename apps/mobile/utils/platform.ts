import { Platform, Dimensions } from 'react-native';

export const isWeb = Platform.OS === 'web';
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';
export const isMobile = isIOS || isAndroid;

export function isWideScreen(): boolean {
  const { width } = Dimensions.get('window');
  return width >= 768;
}

export const SIDEBAR_WIDTH = 320;
