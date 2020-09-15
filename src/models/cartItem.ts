import { Entity, Column, ManyToOne } from 'typeorm';
import DynamicEntity from './dynamicEntity';
import ItemModel from './item';
import CartModel from './cart';
import UserModel from './user';

@Entity({ name: 'cartitems' })
export default class CartItemModel extends DynamicEntity {
  @Column()
  quantity: number;

  @ManyToOne(() => ItemModel, (item) => item.cartItems, { nullable: false })
  item: ItemModel;

  @ManyToOne(() => CartModel, (cart) => cart.cartItems, { onDelete: 'CASCADE', nullable: false })
  cart: CartModel;

  @ManyToOne(() => UserModel, (user) => user.cartItems, { nullable: false })
  forUser: UserModel;
}
