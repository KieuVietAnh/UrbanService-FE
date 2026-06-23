// import React, { useEffect } from 'react';
// import { StyleSheet, Text, View } from 'react-native';
// import { chatbotApi } from '@urbanmind/shared-api';

// export default function App() {
//   useEffect(() => {
//     console.log('Shared API layer initialized for mobile:', typeof chatbotApi.sendMessage === 'function');
//   }, []);

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>UrbanMind Mobile App</Text>
//       <Text style={styles.subtitle}>Citizen & Helper Portal Placeholder</Text>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#fff',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   title: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: '#0052CC',
//   },
//   subtitle: {
//     fontSize: 14,
//     color: '#666',
//     marginTop: 8,
//   },
// });



// import { StatusBar } from 'expo-status-bar';
// import { StyleSheet, Text, View } from 'react-native';

// export default function App() {
//   console.log('APP JS IS RUNNING');

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>URBANSERVICE MOBILE</Text>
//       <Text style={styles.text}>Đã chạy được trên Android Emulator ✅</Text>
//       <StatusBar style="light" />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#007AFF',
//     alignItems: 'center',
//     justifyContent: 'center',
//     padding: 24,
//   },
//   title: {
//     color: '#FFFFFF',
//     fontSize: 28,
//     fontWeight: '800',
//     textAlign: 'center',
//     marginBottom: 16,
//   },
//   text: {
//     color: '#FFFFFF',
//     fontSize: 18,
//     textAlign: 'center',
//   },
// });

// App.js is intentionally left empty for Expo Router.
// The root component is handled by expo-router/entry.