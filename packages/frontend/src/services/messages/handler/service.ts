import DS from 'ember-data';
import Service from '@ember/service';
import { service } from '@ember-decorators/service';

import Identity from 'emberclear/src/data/models/identity/model';
import Message, { TYPE, TARGET } from 'emberclear/src/data/models/message';
import IdentityService from 'emberclear/services/identity/service';
import StatusManager from 'emberclear/services/status-manager';
import ContactManager from 'emberclear/services/contact-manager';
import AutoResponder from 'emberclear/src/services/messages/auto-responder';


export default class ReceivedMessageHandler extends Service {
  @service store!: DS.Store;
  @service statusManager!: StatusManager;
  @service identity!: IdentityService;
  @service contactManager!: ContactManager;
  @service('messages/auto-responder') autoResponder!: AutoResponder;

  async handle(raw: RelayJson) {
    const message = await this.decomposeMessage(raw);
    const type = message.type;

    switch (type) {
      case TYPE.CHAT:
        return this.handleChat(message, raw);

      case TYPE.EMOTE:
        return this.handleChat(message, raw);

      case TYPE.DELIVERY_CONFIRMATION:
        return this.handleDeliveryConfirmation(message, raw);

      case TYPE.DISCONNECT:
        return this.handleDisconnect(message);

      case TYPE.INFO_CHANNEL_SYNC:
        return this.handleInfoChannelInfo(message, raw);

      case TYPE.PING:
        // do nothing, we do not need to send a response
        // at least for now, we have socket-level tools to know
        // when a message was sent successfully
        return message;

      default:
        console.info('Unrecognized message to handle...', raw);
        return message;
    }
  }

  private async handleDeliveryConfirmation(message: Message, raw: RelayJson) {
    const targetMessage = await this.store.findRecord('message', raw.to);

    // targetMessage.set('confirmationFor', message);
    message.deliveryConfirmations!.pushObject(targetMessage);

    // blocking?
    await message.save();

    return message;
  }

  private async handleInfoChannelInfo(message: Message, raw: RelayJson) {
    return message;
  }

  private async handleDisconnect(message: Message) {
    this.statusManager.markOffline(message.from);
  }

  private async handleChat(message: Message, raw: RelayJson) {
    this.autoResponder.messageReceived(message);

    switch (message.target) {

      case TARGET.WHISPER:
        return this.handleWhisperChat(message);

      case TARGET.CHANNEL:
        return this.handleChannelChat(message, raw);

      default:
        console.info('TARGET INVALID', raw);
        return message;
    }

  }

  private async handleWhisperChat(message: Message) {
    await message.save();

    return message;
  }

  private async handleChannelChat(message: Message, raw: RelayJson) {
    // TODO: if message is a channel message, deconstruct the channel info

    return message;
  }


  private async decomposeMessage(json: RelayJson) {
    const { id, type, target, message: msg, sender: senderInfo } = json;

    const sender = await this.findOrCreateSender(senderInfo);

    this.statusManager.markOnline(sender);

    const message = this.store.createRecord('message', {
      id,
      type,
      target,
      sender,
      from: sender.uid,
      to: this.identity.uid,
      sentAt: new Date(json.time_sent),
      receivedAt: new Date(),
      body: msg.body,
      // thread: msg.thread,
      contentType: msg.contentType,
    });

    return message;
  }

  private async findOrCreateSender(senderData: RelayJson["sender"]): Promise<Identity> {
    const { name, uid } = senderData;

    if (uid === this.identity.uid) {
      return this.identity.record!;
    }

    return await this.contactManager.findOrCreate(uid, name);
  }
}

declare module '@ember/service' {
  interface Registry {
    'messages/handler': ReceivedMessageHandler
  }
}
