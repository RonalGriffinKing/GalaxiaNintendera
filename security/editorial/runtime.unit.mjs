import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assertServerConfiguration} from './runtime.mjs';
test('ordinary server configuration denies missing credentials, wrong project and emulators without initializing SDK',()=>{
 assert.throws(()=>assertServerConfiguration({}));
 assert.doesNotThrow(()=>assertServerConfiguration({GALAXIA_FIREBASE_PROJECT:'widget-dreams',GOOGLE_APPLICATION_CREDENTIALS:'FICTITIOUS_PATH_ONLY'}));
 for(const patch of [{GALAXIA_FIREBASE_PROJECT:'other'},{GOOGLE_APPLICATION_CREDENTIALS:''},{FIRESTORE_EMULATOR_HOST:'127.0.0.1:8179'},{FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9199'},{GCLOUD_PROJECT:'other'},{GOOGLE_CLOUD_PROJECT:'other'}])assert.throws(()=>assertServerConfiguration({GALAXIA_FIREBASE_PROJECT:'widget-dreams',GOOGLE_APPLICATION_CREDENTIALS:'FICTITIOUS_PATH_ONLY',...patch}));
});
