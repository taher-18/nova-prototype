import { Platform } from 'react-native';
import { PROTOTYPE } from './config';
import { captureTesterIdFromUrl } from './testerId';

if (PROTOTYPE && Platform.OS === 'web') captureTesterIdFromUrl();
