import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import TeamModel from './team';

@Entity({ name: 'tournaments' })
export default class Tournament {
  @PrimaryColumn()
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'smallint' })
  maxPlayers: number;

  @Column({ type: 'smallint' })
  playersPerTeam: number;

  @OneToMany(() => TeamModel, (team) => team.tournament)
  teams: TeamModel[];
}
