import Route from '@ember/routing/route';
import { inject as service } from '@ember-decorators/service';

import IdentityService from 'emberclear/services/identity/service';

export default class ContactsRoute extends Route {
  @service identity!: IdentityService;

  async beforeModel() {
    const exists = await this.identity.exists();

    if (!exists) {
      this.transitionTo('setup');
    }
  }

  async model(this: ContactsRoute) {
    const identities = await this.store.findAll('identity', { backgroundReload: true });

    return { identities };
  }
}
