import Route from '@ember/routing/route';
import { inject as service } from '@ember-decorators/service';

import IdentityService from 'emberclear/services/identity/service';
import { IModel as ChatModel } from 'emberclear/ui/routes/chat/route';

interface IModelParams {
  channel_id: string;
}

export default class ChatInChannelRoute extends Route {
  @service identity!: IdentityService;

  async model(params: IModelParams) {
    const { channel_id } = params;

    const targetChannel = await this.store.findRecord('channel', channel_id);
    // TODO: filter these messages down
    const chatModel = this.modelFor('chat') as ChatModel;

    return {
      targetChannel,
      messages: chatModel.messages,
    };
  }
}
