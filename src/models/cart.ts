import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { DynamicEntity } from './dynamicEntity';
import { TransactionState } from '../types';
import { User } from './user';
import { CartItem } from './cartItem';

@Entity({ name: 'carts' })
export default class Cart extends DynamicEntity {
  @Column({ type: 'enum', enum: TransactionState, default: TransactionState.Pending })
  transactionState: TransactionState;

  @Column({ nullable: true })
  transactionId: number;

  @Column({ nullable: true })
  paidAt: Date;

  @ManyToOne(() => User, (user) => user.carts, { nullable: false })
  user: User;

  @OneToMany(() => CartItem, (cartitem) => cartitem.cart)
  cartItems: CartItem[];
}
