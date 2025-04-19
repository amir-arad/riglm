import { appSdk } from './app-sdk';

import { rpcClient } from 'typed-rpc';

export const rpc = rpcClient({
    url: appSdk.getConfig().serverUrl + '/rpc',
});
