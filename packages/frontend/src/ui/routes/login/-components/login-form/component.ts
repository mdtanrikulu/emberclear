import Component from '@ember/component';

import { inject as service } from '@ember-decorators/service';
import { action } from '@ember-decorators/object';
import { alias } from '@ember-decorators/object/computed';
import { dropTask } from 'ember-concurrency-decorators';

import IdentityService from 'emberclear/services/identity/service';
import Toast from 'emberclear/services/toast';
import Settings from 'emberclear/services/settings';

import { naclBoxPrivateKeyFromMnemonic } from 'emberclear/src/utils/mnemonic/utils';
import { derivePublicKey } from 'emberclear/src/utils/nacl/utils';

export default class LoginForm extends Component {
  @service identity!: IdentityService;
  @service settings!: Settings;
  @service toast!: Toast;
  @service router!: Router;

  mnemonic = '';
  name = '';
  scanning = false;

  @alias('identity.isLoggedIn') isLoggedIn!: boolean;

  @dropTask
  *login(this: LoginForm) {
    try {
      const name = this.name;
      const privateKey = yield naclBoxPrivateKeyFromMnemonic(this.mnemonic);
      const publicKey = yield derivePublicKey(privateKey);

      yield this.identity.setIdentity(name, privateKey, publicKey);

      this.router.transitionTo('chat');
    } catch (e) {
      console.error(e);
      this.toast.error('There was a problem logging in...');
    }
  }

  @dropTask
  *uploadSettings(data: string) {
    try {
      yield this.settings.import(data);

      this.router.transitionTo('settings');
    } catch (e) {
      console.error(e);
      this.toast.error('There was a problem processing your file...');
    }
  }

  @action
  toggleScanning(this: LoginForm) {
    this.set('scanning', !this.scanning);
  }

  @action
  onScan(this: LoginForm, settingsJson: string) {
    this.uploadSettings.perform(settingsJson);
  }

  @action
  onScanError(e: Error) {
    this.toast.error(e.message);
  }
}
