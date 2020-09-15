import { getConnection, InsertResult } from 'typeorm';
import { ItemCategory, Item } from '../types';
import ItemModel from '../models/item';

export default (): Promise<InsertResult> => {
  const items: Item[] = [
    {
      id: 'ticket-player',
      name: 'Place joueur',
      category: ItemCategory.Ticket,
      price: 800,
      reducedPrice: 500,
    },
    {
      id: 'ticket-coach',
      name: 'Place coach',
      category: ItemCategory.Ticket,
      price: 0,
    },
    {
      id: 'ticket-visitor',
      name: 'Place accompagnateur',
      category: ItemCategory.Ticket,
      price: 1200,
      stock: 0,
    },
    {
      id: 'ethernet-5',
      name: 'Câble ethernet (5m)',
      category: ItemCategory.Item,
      price: 700,
      infos: 'Un câble ethernet est requis pour se brancher aux switchs des tables',
      stock: 0,
    },
    {
      id: 'ethernet-7',
      name: 'Câble ethernet (7m)',
      category: ItemCategory.Item,
      price: 1000,
      infos: 'Un câble ethernet plus long pour les joueurs situés en bout de table',
      stock: 0,
    },
    {
      id: 'multi-socket',
      name: 'Multiprise 3 trous',
      category: ItemCategory.Item,
      price: 500,
      infos: 'Une multiprise 3 trous pour brancher tout ton setup',
      stock: 0,
    },
    {
      id: 'tombola',
      name: 'Ticket tombola',
      category: ItemCategory.Item,
      price: 100,
      infos: 'Participe à la tombola qui aura lieu pendant le weekend !',
      stock: 0,
    },
    {
      id: 'pin',
      name: "Pin's",
      category: ItemCategory.Item,
      price: 100,
      infos: "Un pin's doré, souvenir de cette LAN de folie",
      image: 'pin.png',
      stock: 0,
    },
  ];

  const sizes = ['s', 'm', 'l', 'xl'];
  const models = [
    {
      id: 'h',
      name: 'Homme',
    },
    {
      id: 'f',
      name: 'Femme',
    },
  ];

  sizes.forEach((size) => {
    models.forEach((model) => {
      items.push({
        id: `tshirt-${model.id}-${size}`,
        name: `T-shirt UA 2020 (${model.name})`,
        category: ItemCategory.Item,
        price: 1299,
        attribute: size,
        infos: 'Un t-shirt souvenir de cette LAN de folie',
        image: 'tshirt.png',
        stock: 0,
      });
    });
  });

  return getConnection().createQueryBuilder().insert().into(ItemModel).values(items).execute();
};
