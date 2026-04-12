import Constants from 'expo-constants';

const DEFAULT_API_URL = 'https://kms-api-gkexamccg9hfbza8.southeastasia-01.azurewebsites.net/api';

const configuredApiUrl = Constants.expoConfig?.extra?.apiUrl || DEFAULT_API_URL;
export const BASE_URL = configuredApiUrl.endsWith('/api')
  ? configuredApiUrl
  : `${configuredApiUrl.replace(/\/$/, '')}/api`;
