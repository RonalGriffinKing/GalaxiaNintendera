import {initializeApp,deleteApp,cert} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {ADMIN_UID,PROJECT_ID} from './config.mjs';
import {createEditorialService} from './service.mjs';
import {createProfileService} from '../profile.mjs';
import {createPublicEditorialReader} from './reader.mjs';
import {createIconPurchaseService} from '../icon-purchase.mjs';
import {createProgressService} from '../profile-progress.mjs';
import {createFollowService} from '../follow.mjs';
import {createCommunityService} from '../community.mjs';
export function assertServerConfiguration(env=process.env){
 if(env.GALAXIA_FIREBASE_PROJECT!==PROJECT_ID||!ADMIN_UID.trim()||Number(!!env.GOOGLE_APPLICATION_CREDENTIALS)+Number(!!env.FIREBASE_ADMIN_CREDENTIALS)!==1)throw Error('server-not-configured');
 if(env.FIRESTORE_EMULATOR_HOST||env.FIREBASE_AUTH_EMULATOR_HOST||env.FIREBASE_CONFIG||env.GCLOUD_PROJECT&&env.GCLOUD_PROJECT!=='widget-dreams'||env.GOOGLE_CLOUD_PROJECT&&env.GOOGLE_CLOUD_PROJECT!=='widget-dreams')throw Error('server-project-mismatch');
}
export function createServerRuntime(){
 assertServerConfiguration();
 const credentialFile=JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS||readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS,'utf8'));
 if(credentialFile.type!=='service_account'||credentialFile.project_id!==PROJECT_ID)throw Error('server-credential-project-mismatch');
 const app=initializeApp({projectId:PROJECT_ID,credential:cert(credentialFile)},'galaxia-'+randomUUID());
 const reader=createPublicEditorialReader({db:getFirestore(app)});
 const dependencies={db:getFirestore(app),auth:getAuth(app),adminUid:ADMIN_UID};
 return {reader,service:createEditorialService(dependencies),profiles:createProfileService({...dependencies,iconPurchases:createIconPurchaseService(dependencies),progress:createProgressService(dependencies),follows:createFollowService(dependencies),community:createCommunityService(dependencies)}),close:async()=>{await reader.close();await deleteApp(app);}};
}
