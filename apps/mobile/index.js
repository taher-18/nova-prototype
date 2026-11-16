// App entry. In the web prototype the tester ID (?t=) is saved first, before
// Expo Router starts and may rewrite the address. Elsewhere this is a no-op.
import './src/prototype/captureTester';
import 'expo-router/entry';
