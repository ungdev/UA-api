import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { getConnection } from 'typeorm';
import { Item } from '../models/item';
import { ItemCategory } from '../types';

export default () => {
  const items: QueryDeepPartialEntity<Item>[] = [
    {
      id: 1,
      name: 'Place joueur',
      category: ItemCategory.Ticket,
      price: 1999,
      reducedPrice: 1499,
      attribute: null,
    },
    {
      id: 2,
      name: 'Place coach',
      category: ItemCategory.Ticket,
      price: 1199,
    },
    {
      id: 3,
      name: 'Place accompagnateur',
      category: ItemCategory.Ticket,
      price: 1199,
      stock: 40,
    },
    {
      id: 4,
      name: 'Câble ethernet (5m)',
      category: ItemCategory.Item,
      price: 699,
      infos: 'Un câble ethernet de 5m est requis pour se brancher aux switchs des tables',
    },
    {
      id: 5,
      name: 'Câble ethernet (7m)',
      category: ItemCategory.Item,
      price: 999,
      infos: 'Un câble ethernet de 7m plus long pour les joueurs situés en bout de table',
    },
    {
      id: 6,
      name: 'Multiprise 3 trous',
      category: ItemCategory.Item,
      price: 499,
      infos: 'Une multiprise 3 trous pour brancher tout ton setup',
    },
    {
      id: 7,
      name: 'Ticket tombola',
      category: ItemCategory.Item,
      price: 99,
      infos: 'Pour participer à la tombola qui aura lieu pendant le weekend',
    },
    {
      id: 8,
      name: "Pin's",
      category: ItemCategory.Item,
      price: 99,
      infos: "Un pin's doré souvenir de cette LAN de folie",
      image: 'pins.png',
    },
  ];

  const sizes = ['s', 'm', 'l', 'xl'];

  sizes.forEach((size, index) => {
    items.push(
      {
        id: items.length + 1 - index, // in order to have all tee-shirts next to each other
        name: 'T-shirt UA 2020 (Homme)',
        category: ItemCategory.Item,
        price: 1299,
        attribute: size,
        infos: 'Un t-shirt souvenir de cette LAN de folie',
        image: 'tshirt.png',
      },
      {
        id: items.length + sizes.length + 1 - index,
        name: 'T-shirt UA 2020 (Femme)',
        category: ItemCategory.Item,
        price: 1299,
        attribute: size,
        infos: 'Un t-shirt souvenir de cette LAN de folie',
        image: 'tshirt.png',
      },
    );
  });

  return getConnection().createQueryBuilder().insert().into(Item).values(items).execute();
};
