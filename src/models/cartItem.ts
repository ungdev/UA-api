import { Entity, Column, ManyToOne } from 'typeorm';
import { DynamicEntity } from './dynamicEntity';
import { Item } from './item';
import Cart from './cart';
import { User } from './user';

@Entity({ name: 'cartitems' })
export class CartItem extends DynamicEntity {
  @Column()
  quantity: number;

  @ManyToOne(() => Item, (item) => item.cartItems, { nullable: false })
  item: Item;

  @ManyToOne(() => Cart, (cart) => cart.cartItems, { onDelete: 'CASCADE', nullable: false })
  cart: Cart;

  @ManyToOne(() => User, (user) => user.cartItems, { nullable: false })
  forUser: User;
}
