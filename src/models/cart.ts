import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import DynamicEntity from './dynamicEntity';
import { TransactionState } from '../types';
import UserModel from './user';
import CartItemModel from './cartItem';

@Entity({ name: 'carts' })
export default class CartModel extends DynamicEntity {
  @Column({ type: 'enum', enum: TransactionState, default: TransactionState.Pending })
  transactionState: TransactionState;

  @Column({ nullable: true })
  transactionId: number;

  @Column({ nullable: true })
  paidAt: Date;

  @ManyToOne(() => UserModel, (user) => user.carts, { nullable: false })
  user: UserModel;

  @OneToMany(() => CartItemModel, (cartitem) => cartitem.cart)
  cartItems: CartItemModel[];
}
